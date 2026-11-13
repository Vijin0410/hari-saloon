import type { FinanceReport, FinanceGroup } from '@/features/finance/model/financeTypes';
import { Card } from '@/shared/ui/Card';
import { StatCard } from '@/shared/ui/StatCard';
import { Table, type TableColumn } from '@/shared/ui/Table';
import { formatCurrency } from '@/shared/lib/format';
import { getDictText } from '@/shared/lib/dict';
/** 日结与看板共用汇总、收款方式和趋势；金额分类不交叉累计。 */
export function ReportPanels({
  report,
  rankings = false,
}: {
  report: FinanceReport;
  rankings?: boolean;
}) {
  const s = report.summary;
  const monthlyTrend = report.trendPeriod === 'MONTH';
  const trendMaximum = Math.max(1, ...report.trend.map((row) => Number(row.amount)));
  const groups: TableColumn<FinanceGroup>[] = [
    { title: '名称', render: (r) => r.label },
    { title: '数量', render: (r) => r.count, align: 'right' },
    { title: '金额', render: (r) => formatCurrency(r.amount), align: 'right' },
  ];
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="消费实收"
          value={formatCurrency(s.consumptionAmount)}
          hint={s.orderCount + ' 笔订单 · 含会员余额，不含积分'}
        />
        <StatCard
          label="消费净额"
          value={formatCurrency(s.netConsumption)}
          hint={'减当期成功退款 ' + formatCurrency(s.refundAmount)}
          tone="accent"
        />
        <StatCard
          label="充值本金"
          value={formatCurrency(s.rechargeAmount)}
          hint={'预收款 · 赠送 ' + formatCurrency(s.rechargeGift)}
        />
        <StatCard
          label="外部净收款"
          value={formatCurrency(s.netCashflow)}
          hint="消费及充值收款减外部退款，未扣渠道手续费"
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="收款与退款">
          <div className="grid grid-cols-2 gap-3">
            {[
              ['外部收款', formatCurrency(s.externalInflow)],
              ['外部退款', formatCurrency(s.externalRefund)],
              ['消费会员', s.memberCount + ' 人'],
              ['新增会员', s.newMemberCount + ' 人'],
              ['平均客单价', formatCurrency(s.orderCount ? s.consumptionAmount / s.orderCount : 0)],
              ['积分抵扣折算', formatCurrency(s.pointAmount)],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0 rounded-lg bg-salon-paper p-3 dark:bg-zinc-900">
                <p className="text-xs text-zinc-500">{label}</p>
                <p className="mt-2 break-words font-semibold tabular-nums">{value}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card title="本金流水核对">
          <div className="space-y-3 text-sm">
            {[
              ['期初', s.principalOpening],
              ['本期净变动', s.principalChange],
              ['期末', s.principalClosing],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3">
                <span className="text-zinc-500">{label}</span>
                <span className="font-semibold tabular-nums">{formatCurrency(value)}</span>
              </div>
            ))}
            <p className="pt-3 text-xs leading-6 text-zinc-500">
              按会员归属门店的本金流水累计，包含人工调整、消费和退款；历史期初资产须有对应流水。跨店消费的资金统计按交易门店归属。渠道手续费与结算到账仍待账单核对。
            </p>
          </div>
        </Card>
      </div>
      <Card title="支付方式汇总">
        <Table
          rowKey={(r) => r.payMethod}
          data={report.channels}
          columns={[
            {
              title: '支付方式',
              render: (r) => (
                <span>
                  {getDictText(r.payMethod_text)}
                  {r.payMethod === 7 ? '（积分折算）' : ''}
                </span>
              ),
            },
            { title: '消费', render: (r) => formatCurrency(r.orderAmount), align: 'right' },
            { title: '充值', render: (r) => formatCurrency(r.rechargeAmount), align: 'right' },
            { title: '退款', render: (r) => formatCurrency(r.refundAmount), align: 'right' },
            { title: '净额', render: (r) => formatCurrency(r.netAmount), align: 'right' },
          ]}
        />
        <p className="mt-3 text-xs text-zinc-500">
          会员余额为内部扣款，积分为权益折算，两者均不计外部收款。
        </p>
      </Card>
      {rankings ? (
        <>
          <Card title={monthlyTrend ? '每月经营趋势' : '每日经营趋势'}>
            <div
              className="mb-4 flex h-36 items-end gap-1 overflow-x-auto"
              role="img"
              aria-label={(monthlyTrend ? '每月' : '每日') + '消费实收柱状趋势，详细数值见下表'}
            >
              {report.trend.map((r) => (
                <div
                  key={r.label}
                  title={r.label + '：' + formatCurrency(r.amount)}
                  className="flex min-w-3 flex-1 items-end self-stretch"
                >
                  <div
                    className="w-full rounded-t bg-salon-accent/70"
                    style={{
                      height: Math.max(2, (Number(r.amount) / trendMaximum) * 100) + '%',
                    }}
                  />
                </div>
              ))}
            </div>
            <Table
              className="max-h-80 overflow-auto"
              stickyHeader
              data={report.trend}
              rowKey={(r) => r.label}
              columns={[
                { title: monthlyTrend ? '月份' : '日期', render: (r) => r.label },
                { title: '订单数', render: (r) => r.count, align: 'right' },
                { title: '消费实收', render: (r) => formatCurrency(r.amount), align: 'right' },
                {
                  title: '成功退款',
                  render: (r) => formatCurrency(r.refundAmount),
                  align: 'right',
                },
                {
                  title: '充值本金',
                  render: (r) => formatCurrency(r.rechargeAmount),
                  align: 'right',
                },
              ]}
            />
          </Card>
          <Card title="门店经营汇总">
            <Table
              data={report.stores}
              rowKey={(r) => String(r.entityId)}
              columns={[
                { title: '门店', render: (r) => r.label },
                { title: '消费订单数', render: (r) => r.count, align: 'right' },
                { title: '消费实收', render: (r) => formatCurrency(r.amount), align: 'right' },
                {
                  title: '当期退款',
                  render: (r) => formatCurrency(r.refundAmount),
                  align: 'right',
                },
                {
                  title: '充值本金',
                  render: (r) => formatCurrency(r.rechargeAmount),
                  align: 'right',
                },
              ]}
            />
          </Card>
          <p className="text-xs leading-6 text-zinc-500">
            服务与商品排行按订单行折后金额统计，含积分抵扣前金额；当前金额退款没有项目分摊，以下排行均为退款前金额，不能作为员工最终提成基数。
          </p>
          <div className="grid items-start gap-4 xl:grid-cols-2">
            {[
              ['服务排行 · 前20项', report.services],
              ['商品排行 · 前20项', report.goods],
              ['会员消费排行 · 前20名', report.members],
            ].map(([title, rows]) => (
              <Card key={title as string} title={title as string}>
                <Table
                  data={rows as FinanceGroup[]}
                  rowKey={(r, i) => String(r.tenantId) + '-' + r.entityId + '-' + i}
                  columns={groups}
                />
              </Card>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
