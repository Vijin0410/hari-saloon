import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { URL } from 'node:url';
import ts from 'typescript';
import { z } from 'zod';

// 使用项目已有 TypeScript 编译器和 Node 测试器，无需额外测试依赖。
function loadModel(file, dependencies = {}) {
  const source = readFileSync(
    new URL(`../src/features/order/model/${file}.ts`, import.meta.url),
    'utf8',
  );
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const result = { exports: {} };
  const requireModel = (name) => {
    assert.ok(name in dependencies, `未声明的测试依赖：${name}`);
    return dependencies[name];
  };
  new Function('require', 'exports', 'module', outputText)(requireModel, result.exports, result);
  return result.exports;
}

const settlement = loadModel('orderSettlement', { './orderTypes': loadModel('orderTypes') });
const schemas = loadModel('orderSchemas', {
  './orderSettlement': settlement,
  zod: { z },
});
const { createOrderPaySchema } = schemas;
const { defaultStaffAssignment, staffAssignmentError, assignStaff, createStaffCorrectionValues, commonStaffAssignment } = loadModel('orderStaff', { './orderSchemas': schemas });
const { maxRedeemPoints, pointsDeduction, allocatePayments, reallocatePayments } = settlement;
const base = {
  payable: 100,
  pointsEnabled: true,
  member: { points: 1000, balance: 50, pointDebt: 0 },
};
const staffOptions = [
  { id: '1', name: '服务人员', defaultType: 'STAFF' },
  { id: '2', name: '助理', defaultType: 'ASSISTANT' },
  { id: '3', name: '收银员', defaultType: 'NONE' },
  { id: '4', name: '双身份', defaultType: 'CONFLICT' },
];

test('默认直接带入登录用户，明确配置助理时带入助理栏', () => {
  assert.deepEqual(defaultStaffAssignment('1', staffOptions), { staffId: '1', assistantId: '' });
  assert.deepEqual(defaultStaffAssignment('2', staffOptions), { staffId: '', assistantId: '2' });
  for (const userId of ['3', '4'])
    assert.deepEqual(defaultStaffAssignment(userId, staffOptions), { staffId: userId, assistantId: '' });
  for (const userId of ['5', undefined])
    assert.deepEqual(defaultStaffAssignment(userId, staffOptions), { staffId: '', assistantId: '' });
});

test('结算人员必填、启用且属本门店，服务人员与助理不能相同', () => {
  for (const row of [
    { staffId: '', assistantId: '' },
    { staffId: '5', assistantId: '' },
    { staffId: '1', assistantId: '5' },
    { staffId: '1', assistantId: '1' },
  ]) assert.ok(staffAssignmentError(row, staffOptions));
  assert.equal(staffAssignmentError({ staffId: '1', assistantId: '2' }, staffOptions), undefined);
  assert.equal(staffAssignmentError({ staffId: '1', assistantId: '' }, staffOptions), undefined);
});

test('统一服务人员确认后回填全部明细，可清空助理，保留其他字段', () => {
  const rows = [{ id: 'a', staffId: '3', assistantId: '4' }, { id: 'b', staffId: '', assistantId: '' }];
  assert.deepEqual(assignStaff(rows, '1', '2'), [
    { id: 'a', staffId: '1', assistantId: '2' }, { id: 'b', staffId: '1', assistantId: '2' },
  ]);
  assert.deepEqual(assignStaff(rows, '1', ''), [
    { id: 'a', staffId: '1', assistantId: '' }, { id: 'b', staffId: '1', assistantId: '' },
  ]);
  assert.equal(rows[0].assistantId, '4');
  assert.equal(schemas.orderStaffBatchSchema.safeParse({ staffId: '', assistantId: '2' }).success, false);
  assert.equal(schemas.orderStaffBatchSchema.safeParse({ staffId: '1', assistantId: '1' }).success, false);
  assert.equal(schemas.orderStaffBatchSchema.safeParse({ staffId: '1', assistantId: '' }).success, true);
});

test('更正表单按原人员逐项回显，空助理与大整数ID保持原意', () => {
  const source = [
    { id: '9007199254740993', staffId: '9007199254740995', assistantId: '9007199254740997' },
    { id: '2', staffId: '3', assistantId: null },
  ];
  const values = createStaffCorrectionValues(source);
  assert.deepEqual(values, { reason: '', items: [
    { orderItemId: source[0].id, staffId: source[0].staffId, assistantId: source[0].assistantId, expectedStaffId: source[0].staffId, expectedAssistantId: source[0].assistantId },
    { orderItemId: '2', staffId: '3', assistantId: '', expectedStaffId: '3', expectedAssistantId: '' },
  ] });
  const updated = assignStaff(values.items, '10', '11');
  assert.equal(updated[0].expectedStaffId, source[0].staffId);
  assert.equal(updated[0].expectedAssistantId, source[0].assistantId);
  assert.equal(values.items[0].staffId, source[0].staffId);
  assert.deepEqual(createStaffCorrectionValues(source), values);
});

test('统一人员弹窗仅预选所有明细一致的原分配', () => {
  assert.deepEqual(commonStaffAssignment([]), { staffId: '', assistantId: '' });
  assert.deepEqual(commonStaffAssignment([{ staffId: '1', assistantId: '2' }, { staffId: '1', assistantId: '2' }]), { staffId: '1', assistantId: '2' });
  assert.deepEqual(commonStaffAssignment([{ staffId: '1', assistantId: '2' }, { staffId: '3', assistantId: '2' }]), { staffId: '', assistantId: '2' });
});

test('人员更正需原因，补录仍必须通过人员校验', () => {
  const values = { reason: '补录遗漏人员', items: [{
    orderItemId: '10', staffId: '1', assistantId: '2', expectedStaffId: '', expectedAssistantId: '',
  }] };
  assert.equal(schemas.orderStaffCorrectionSchema.safeParse(values).success, true);
  assert.equal(schemas.orderStaffCorrectionSchema.safeParse({ ...values, reason: '  ' }).success, false);
  assert.equal(schemas.orderStaffCorrectionSchema.safeParse({ ...values, items: [{ ...values.items[0], staffId: '' }] }).success, false);
});
function paymentValues(context, usePoints = maxRedeemPoints(context)) {
  return {
    usePoints: String(usePoints),
    cashReceived: '100',
    payments: allocatePayments(
      context.payable - pointsDeduction(context, usePoints),
      context.member?.balance ?? 0,
    ),
  };
}

test('默认使用全部可用积分，优先余额，现金仅收差额', () => {
  const values = paymentValues(base);
  assert.equal(values.usePoints, '1000');
  assert.deepEqual(values.payments, [
    { payMethod: 5, amount: '50.00' },
    { payMethod: 1, amount: '40.00' },
  ]);
  assert.equal(createOrderPaySchema(base).safeParse(values).success, true);
});

test('积分不足100分、租户关闭、积分待追回及散客均不自动抵扣', () => {
  for (const context of [
    { ...base, pointsEnabled: false },
    { ...base, member: null },
    { ...base, member: { ...base.member, points: 99 } },
    { ...base, member: { ...base.member, pointDebt: 1 } },
  ]) {
    assert.equal(maxRedeemPoints(context), 0);
    assert.equal(pointsDeduction(context, 100), 0);
  }
});

test('100积分可起抵，150积分可全部使用，无需100的整数倍', () => {
  assert.equal(pointsDeduction(base, 100), 1);
  assert.equal(pointsDeduction(base, 150), 1.5);
  assert.equal(pointsDeduction(base, 99), 0);
  const context = { ...base, member: { ...base.member, points: 150 } };
  assert.equal(maxRedeemPoints(context), 150);
  assert.equal(createOrderPaySchema(context).safeParse(paymentValues(context)).success, true);
});

test('积分抵扣不超应收，纯积分订单支付行为空', () => {
  const context = { ...base, payable: 2.35 };
  assert.equal(maxRedeemPoints(context), 235);
  const values = paymentValues(context);
  assert.deepEqual(values.payments, []);
  assert.equal(createOrderPaySchema(context).safeParse(values).success, true);
  assert.equal(maxRedeemPoints({ ...context, payable: 0.99 }), 0);
});

test('余额足够时默认预填余额，零余额和散客默认外部支付', () => {
  assert.deepEqual(allocatePayments(40, 50), [{ payMethod: 5, amount: '40.00' }]);
  assert.deepEqual(allocatePayments(40, 0), [{ payMethod: 1, amount: '40.00' }]);
  assert.deepEqual(allocatePayments(0, 50), []);
});

test('修改积分后重新分配金额，并保留已选微信或支付宝渠道', () => {
  for (const method of [2, 3]) {
    assert.deepEqual(allocatePayments(100 - pointsDeduction(base, 500), 50, method), [
      { payMethod: 5, amount: '50.00' },
      { payMethod: method, amount: '45.00' },
    ]);
    assert.deepEqual(allocatePayments(100 - pointsDeduction(base, 0), 50, method), [
      { payMethod: 5, amount: '50.00' },
      { payMethod: method, amount: '50.00' },
    ]);
  }
});

test('按分计算组合支付，不产生小数尾差', () => {
  assert.deepEqual(allocatePayments(0.3, 0.1, 2), [
    { payMethod: 5, amount: '0.10' },
    { payMethod: 2, amount: '0.20' },
  ]);
  assert.equal(pointsDeduction({ ...base, payable: 1.01 }, 101), 1.01);
});

test('会员余额充足时仍可全额使用现金、微信、支付宝等方式', () => {
  const context = { ...base, member: { ...base.member, balance: 500 } };
  for (const payMethod of [1, 2, 3, 4, 8]) {
    const values = { ...paymentValues(context), payments: [{ payMethod, amount: '90.00' }] };
    assert.equal(createOrderPaySchema(context).safeParse(values).success, true);
  }
});

test('选定外部支付后修改积分不会重新加入余额支付', () => {
  for (const payMethod of [1, 2, 3]) {
    assert.deepEqual(reallocatePayments(95, 500, [{ payMethod, amount: '90.00' }]), [
      { payMethod, amount: '95.00' },
    ]);
  }
});

test('修改积分保留手工设置的余额分摊，不自动用完余额', () => {
  assert.deepEqual(
    reallocatePayments(95, 500, [
      { payMethod: 5, amount: '20.00' },
      { payMethod: 2, amount: '70.00' },
    ]),
    [
      { payMethod: 5, amount: '20.00' },
      { payMethod: 2, amount: '75.00' },
    ],
  );
});

test('积分全额抵扣后恢复应收，仍可沿用收银员的外部支付选择', () => {
  const preferences = [{ payMethod: 2, amount: '90.00' }];
  assert.deepEqual(reallocatePayments(0, 500, preferences), []);
  assert.deepEqual(reallocatePayments(95, 500, preferences), [{ payMethod: 2, amount: '95.00' }]);
});

test('移除余额行后，剩余外部支付补齐全额', () => {
  assert.deepEqual(reallocatePayments(90, 50, [{ payMethod: 2, amount: '40.00' }]), [
    { payMethod: 2, amount: '90.00' },
  ]);
});

test('校验拒绝小于100分、超额积分、关闭积分或待追回时使用积分', () => {
  for (const [context, points] of [
    [base, 99],
    [base, 1001],
    [{ ...base, payable: 1 }, 101],
    [{ ...base, pointsEnabled: false }, 100],
    [{ ...base, member: null }, 100],
    [{ ...base, member: { ...base.member, pointDebt: 1 } }, 100],
  ]) {
    const parsed = createOrderPaySchema(context).safeParse(paymentValues(context, points));
    assert.equal(parsed.success, false);
    assert.ok(parsed.error.issues.some((issue) => issue.path[0] === 'usePoints'));
  }
});

test('校验拒绝余额超支、重复支付方式、合计不符、现金投入不足', () => {
  const schema = createOrderPaySchema(base);
  for (const changes of [
    { payments: [{ payMethod: 5, amount: '90' }] },
    {
      payments: [
        { payMethod: 1, amount: '40' },
        { payMethod: 1, amount: '50' },
      ],
    },
    { payments: [{ payMethod: 1, amount: '100' }] },
    { cashReceived: '39' },
    { payments: [{ payMethod: 1, amount: '0' }] },
  ])
    assert.equal(schema.safeParse({ ...paymentValues(base), ...changes }).success, false);
});
