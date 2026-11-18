import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { URL } from 'node:url';
import ts from 'typescript';
import { z } from 'zod';

// 使用项目已有 TypeScript 编译器和 Node 测试器，无需额外测试依赖。
function loadModel(file, dependencies = {}) {
  const source = readFileSync(new URL(`../src/features/order/model/${file}.ts`, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const result = { exports: {} };
  const requireModel = (name) => {
    assert.ok(name in dependencies, `未声明的测试依赖：${name}`);
    return dependencies[name];
  };
  new Function('require', 'exports', 'module', outputText)(requireModel, result.exports, result);
  return result.exports;
}

const settlement = loadModel('orderSettlement', { './orderTypes': loadModel('orderTypes') });
const { createOrderPaySchema } = loadModel('orderSchemas', { './orderSettlement': settlement, zod: { z } });
const { maxRedeemPoints, pointsDeduction, allocatePayments } = settlement;
const base = { payable: 100, pointsEnabled: true, member: { points: 1000, balance: 50, pointDebt: 0 } };
function paymentValues(context, usePoints = maxRedeemPoints(context)) {
  return { usePoints: String(usePoints), cashReceived: '100', payments: allocatePayments(context.payable - pointsDeduction(context, usePoints), context.member?.balance ?? 0) };
}

test('默认使用全部可用积分，优先余额，现金仅收差额', () => {
  const values = paymentValues(base);
  assert.equal(values.usePoints, '1000');
  assert.deepEqual(values.payments, [{ payMethod: 5, amount: '50.00' }, { payMethod: 1, amount: '40.00' }]);
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

test('余额足够时只显示余额，零余额和散客使用外部支付', () => {
  assert.deepEqual(allocatePayments(40, 50), [{ payMethod: 5, amount: '40.00' }]);
  assert.deepEqual(allocatePayments(40, 0), [{ payMethod: 1, amount: '40.00' }]);
  assert.deepEqual(allocatePayments(0, 50), []);
});

test('修改积分后重新分配金额，并保留已选微信或支付宝渠道', () => {
  for (const method of [2, 3]) {
    assert.deepEqual(allocatePayments(100 - pointsDeduction(base, 500), 50, method), [{ payMethod: 5, amount: '50.00' }, { payMethod: method, amount: '45.00' }]);
    assert.deepEqual(allocatePayments(100 - pointsDeduction(base, 0), 50, method), [{ payMethod: 5, amount: '50.00' }, { payMethod: method, amount: '50.00' }]);
  }
});

test('按分计算组合支付，不产生小数尾差', () => {
  assert.deepEqual(allocatePayments(0.3, 0.1, 2), [{ payMethod: 5, amount: '0.10' }, { payMethod: 2, amount: '0.20' }]);
  assert.equal(pointsDeduction({ ...base, payable: 1.01 }, 101), 1.01);
});

test('校验拒绝小于100分、超额积分、关闭积分或待追回时使用积分', () => {
  for (const [context, points] of [
    [base, 99], [base, 1001],
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
    { payments: [{ payMethod: 1, amount: '40' }, { payMethod: 1, amount: '50' }] },
    { payments: [{ payMethod: 1, amount: '100' }] },
    { cashReceived: '39' },
    { payments: [{ payMethod: 1, amount: '0' }] },
  ]) assert.equal(schema.safeParse({ ...paymentValues(base), ...changes }).success, false);
});
