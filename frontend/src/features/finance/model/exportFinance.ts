import type { FinanceReport, FinanceLedger } from './financeTypes';
/** CSV 单元格统一引用并防止用户文本触发电子表格公式。 */
function download(name: string, rows: (string | number | undefined)[][]) {
  const csv = rows
    .map((row) =>
      row
        .map((v) => {
          const s = String(v ?? '');
          return '"' + (/^[=+@\-\t\r]/.test(s) ? "'" + s : s).replaceAll('"', '""') + '"';
        })
        .join(','),
    )
    .join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name + '.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function exportLedger(rows: FinanceLedger[], name: string) {
  download(name, [
    [
      '类型',
      '单号',
      '原订单号',
      '成功时间',
      '门店',
      '会员',
      '业务金额',
      '外部金额',
      '赠送金额',
      '积分折算',
      '操作人ID',
    ],
    ...rows.map((r) => [
      ({ ORDER: '消费', RECHARGE: '充值', REFUND: '退款' } as Record<string, string>)[r.kind],
      r.bizNo,
      r.relatedNo,
      r.eventTime,
      r.storeName,
      r.memberName ?? '散客',
      r.amount,
      r.externalAmount,
      r.giftAmount,
      r.pointAmount,
      r.operatorId,
    ]),
  ]);
}
export function exportReport(r: FinanceReport, name: string) {
  download(name, [
    ['经营报表', '金额/数量'],
    ['消费实收', r.summary.consumptionAmount],
    ['成功退款', r.summary.refundAmount],
    ['消费净额', r.summary.netConsumption],
    ['充值本金', r.summary.rechargeAmount],
    ['充值赠送', r.summary.rechargeGift],
    ['外部净收款（未扣手续费）', r.summary.netCashflow],
    [],
    [r.trendPeriod === 'MONTH' ? '月份' : '日期', '消费订单数', '消费实收', '成功退款', '充值本金'],
    ...r.trend.map((x) => [x.label, x.count, x.amount, x.refundAmount, x.rechargeAmount]),
    [],
    ['门店', '消费订单数', '消费实收', '当期退款', '充值本金'],
    ...r.stores.map((x) => [x.label, x.count, x.amount, x.refundAmount, x.rechargeAmount]),
    ...(['services', 'goods', 'members'] as const).flatMap((k) => [
      [],
      [
        {
          services: '服务排行（退款前）',
          goods: '商品排行（退款前）',
          members: '会员排行（退款前）',
        }[k],
        '数量',
        '金额',
      ],
      ...r[k].map((x) => [x.label, x.count, x.amount]),
    ]),
  ]);
}
