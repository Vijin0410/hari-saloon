import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Download, RefreshCw, CheckCheck } from 'lucide-react';
import { financeApi } from '@/shared/api/modules/financeApi';
import { useTenantStoreFilter } from '@/features/system/model/useTenantStoreFilter';
import {
  businessDate,
  currentMonth,
  currentYear,
  financeFilterSchema,
  monthRange,
  yearRange,
  type FinancePeriod,
} from '@/features/finance/model/financeSchemas';
import { exportLedger, exportReport } from '@/features/finance/model/exportFinance';
import type {
  FinanceQuery,
  FinanceReport,
  FinanceLedger,
  DailySettlement,
} from '@/features/finance/model/financeTypes';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Field } from '@/shared/ui/Field';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { Table } from '@/shared/ui/Table';
import { Pagination } from '@/shared/ui/Pagination';
import { Modal } from '@/shared/ui/Modal';
import { PageLoading } from '@/shared/ui/PageLoading';
import { RequestError } from '@/shared/ui/RequestError';
import { formatCurrency } from '@/shared/lib/format';
import { ReportPanels } from './ReportPanels';
import { SettlementDialog } from './SettlementDialog';
const KIND: Record<string, string> = {
  ORDER: '消费订单',
  RECHARGE: '会员充值',
  REFUND: '成功退款',
};
const PERIOD_OPTIONS: Array<{ value: FinancePeriod; label: string }> = [
  { value: 'month', label: '按月' },
  { value: 'year', label: '按年度' },
  { value: 'custom', label: '自定义日期' },
];
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, index) => String(Number(currentYear()) - index));
/** 财务与报表共用查询口径；异步结果按查询生命周期隔离，失败不显示为零。 */
export function FinanceWorkspace({ mode }: { mode: 'finance' | 'reports' }) {
  const filter = useTenantStoreFilter({
    withStore: true,
    loadStoreOptions: financeApi.storeOptions,
  });
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const storeScoped = !filter.isRoot && !filter.isTenantAdmin;
  const storeOptions = filter.storeOptions;
  const selectedStoreId = filter.storeId;
  const changeStore = filter.changeStore;
  const [query, setQuery] = useState<FinanceQuery>(monthRange(currentMonth()));
  const [revision, setRevision] = useState(0);
  const [report, setReport] = useState<FinanceReport | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [ledger, setLedger] = useState<FinanceLedger[]>([]);
  const [ledgerTotal, setLedgerTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [kind, setKind] = useState('');
  const [ledgerError, setLedgerError] = useState('');
  const [ledgerLoading, setLedgerLoading] = useState(true);
  const [history, setHistory] = useState<DailySettlement[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyError, setHistoryError] = useState('');
  const [historyLoading, setHistoryLoading] = useState(true);
  const [settling, setSettling] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DailySettlement | null>(null);
  const [detailError, setDetailError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [actionError, setActionError] = useState('');
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<z.infer<typeof financeFilterSchema>>({
    resolver: zodResolver(financeFilterSchema),
    defaultValues: {
      period: 'month',
      month: currentMonth(),
      year: currentYear(),
      startDate: query.startDate,
      endDate: query.endDate,
    },
  });
  const period = watch('period');
  useEffect(() => {
    if (!storeScoped || storeOptions.length === 0 || selectedStoreId) {
      return;
    }
    const storeId = storeOptions[0].value;
    if (selectedStoreId !== storeId) {
      changeStore(storeId);
    }
    setQuery((current) => (current.storeId === storeId ? current : { ...current, storeId }));
  }, [changeStore, selectedStoreId, storeOptions, storeScoped]);
  function submitQuery(values: z.infer<typeof financeFilterSchema>) {
    const range =
      values.period === 'month'
        ? monthRange(values.month)
        : values.period === 'year'
          ? yearRange(values.year)
          : { startDate: values.startDate, endDate: values.endDate };
    setLoading(true);
    setLedgerLoading(true);
    setHistoryLoading(true);
    setPage(1);
    setHistoryPage(1);
    setQuery({
      ...range,
      trendPeriod: values.period === 'year' ? 'MONTH' : 'DAY',
      tenantId: filter.isRoot ? filter.tenantId || undefined : undefined,
      storeId: storeScoped
        ? filter.storeId || filter.storeOptions[0]?.value
        : filter.storeId || undefined,
    });
  }
  useEffect(() => {
    let active = true;
    financeApi
      .report(query)
      .then((r) => {
        if (active) {
          setReport(r);
          setError('');
        }
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : '统计加载失败');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [query, revision]);
  useEffect(() => {
    let active = true;
    financeApi
      .ledger({ ...query, kind: kind || undefined, pageNum: page, pageSize: 20 })
      .then((r) => {
        if (active) {
          setLedger(r.list);
          setLedgerTotal(r.total);
          setLedgerError('');
        }
      })
      .catch((e: unknown) => {
        if (active) setLedgerError(e instanceof Error ? e.message : '明细加载失败');
      })
      .finally(() => {
        if (active) setLedgerLoading(false);
      });
    return () => {
      active = false;
    };
  }, [query, kind, page, revision]);
  useEffect(() => {
    let active = true;
    if (mode !== 'finance') return;
    financeApi
      .settlements({ ...query, pageNum: historyPage, pageSize: 10 })
      .then((r) => {
        if (active) {
          setHistory(r.list);
          setHistoryTotal(r.total);
          setHistoryError('');
        }
      })
      .catch((e: unknown) => {
        if (active) setHistoryError(e instanceof Error ? e.message : '日结记录加载失败');
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      });
    return () => {
      active = false;
    };
  }, [query, mode, historyPage, revision]);
  useEffect(() => {
    let active = true;
    if (!detailId) return;
    financeApi
      .detail(detailId)
      .then((r) => {
        if (active) {
          setDetail(r);
          setDetailError('');
        }
      })
      .catch((e: unknown) => {
        if (active) setDetailError(e instanceof Error ? e.message : '快照加载失败');
      });
    return () => {
      active = false;
    };
  }, [detailId]);
  function reload() {
    setLoading(true);
    setLedgerLoading(true);
    setHistoryLoading(true);
    setRevision((v) => v + 1);
  }
  async function downloadLedger() {
    setExporting(true);
    setActionError('');
    try {
      const rows = await financeApi.exportLedger({ ...query, kind: kind || undefined });
      exportLedger(rows, '财务明细_' + query.startDate + '_' + query.endDate);
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : '导出失败');
    } finally {
      setExporting(false);
    }
  }
  return (
    <div className="mx-auto max-w-[1440px] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">
            {mode === 'finance' ? '财务与日结' : '经营报表'}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">按成功日期汇总，消费、充值与权益分别核对。</p>
        </div>
        <div className="flex gap-2">
          {mode === 'finance' && hasPermission('biz:finance:settle') ? (
            <Button
              title="按门店和营业日办理日结"
              icon={<CheckCheck className="size-4" />}
              onClick={() => setSettling(true)}
            >
              办理单日日结
            </Button>
          ) : null}
          <Button variant="secondary" icon={<RefreshCw className="size-4" />} onClick={reload}>
            刷新
          </Button>
        </div>
      </div>
      <Card
        title="报表查询范围"
        extra={<span className="text-xs text-zinc-500">按日期区间查看经营数据</span>}
      >
        <form
          className={
            period === 'custom'
              ? filter.showTenant
                ? 'grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-6'
                : 'grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-5'
              : filter.showTenant
                ? 'grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-5'
                : 'grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-4'
          }
          onSubmit={handleSubmit(submitQuery)}
        >
          {filter.showTenant ? (
            <Field label="租户">
              <Select value={filter.tenantId} onChange={(e) => filter.changeTenant(e.target.value)}>
                <option value="">全部租户</option>
                {filter.tenantOptions.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          <Field label="统计周期">
            <Select {...register('period')}>
              {PERIOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          {period === 'month' ? (
            <Field label="选择月份" error={errors.month?.message}>
              <Input
                type="month"
                max={currentMonth()}
                {...register('month')}
                invalid={!!errors.month}
              />
            </Field>
          ) : period === 'year' ? (
            <Field label="选择年度" error={errors.year?.message}>
              <Select {...register('year')}>
                {YEAR_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option} 年
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          <Field label="门店">
            <Select
              value={filter.storeId}
              onChange={(e) => filter.changeStore(e.target.value)}
              disabled={storeScoped && storeOptions.length <= 1}
            >
              {!storeScoped ? (
                <option value="">全部授权门店</option>
              ) : storeOptions.length === 0 ? (
                <option value="">暂无绑定门店</option>
              ) : null}
              {filter.storeOptions.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          {period === 'custom' ? (
            <>
              <Field label="开始日期" error={errors.startDate?.message}>
                <Input
                  type="date"
                  max={businessDate()}
                  {...register('startDate')}
                  invalid={!!errors.startDate}
                />
              </Field>
              <Field label="结束日期" error={errors.endDate?.message}>
                <Input
                  type="date"
                  max={businessDate()}
                  {...register('endDate')}
                  invalid={!!errors.endDate}
                />
              </Field>
            </>
          ) : null}
          <Button className="mt-6" type="submit">
            查询
          </Button>
        </form>
      </Card>
      <p className="text-xs text-zinc-500">
        当前报表：{query.startDate} 至 {query.endDate}。修改筛选后点击查询生效。
        {mode === 'finance'
          ? '此范围同时用于筛选历史日结记录的营业日。'
          : '此范围只影响经营报表和成功业务明细。'}
      </p>
      {loading ? (
        <PageLoading />
      ) : error ? (
        <RequestError message={error} onRetry={reload} />
      ) : report ? (
        <>
          <ReportPanels report={report} rankings={mode === 'reports'} />
          {hasPermission('biz:finance:export') ? (
            <Button
              variant="secondary"
              icon={<Download className="size-4" />}
              onClick={() =>
                exportReport(report, '经营汇总_' + query.startDate + '_' + query.endDate)
              }
            >
              导出当前汇总与排行
            </Button>
          ) : null}
        </>
      ) : null}
      {actionError ? (
        <p role="alert" className="text-sm text-rose-600">
          {actionError}
        </p>
      ) : null}
      <Card
        title="成功业务明细"
        extra={
          <div className="flex gap-2">
            <Select
              aria-label="明细业务类型"
              value={kind}
              onChange={(e) => {
                setLedgerLoading(true);
                setKind(e.target.value);
                setPage(1);
              }}
            >
              <option value="">全部业务</option>
              {Object.entries(KIND).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
            {hasPermission('biz:finance:export') ? (
              <Button variant="secondary" loading={exporting} onClick={downloadLedger}>
                导出明细
              </Button>
            ) : null}
          </div>
        }
      >
        {ledgerError ? (
          <RequestError message={ledgerError} onRetry={reload} />
        ) : (
          <>
            <Table
              loading={ledgerLoading}
              data={ledger}
              rowKey={(r) => r.kind + r.id}
              columns={[
                {
                  title: '业务/单号',
                  render: (r) => (
                    <div>
                      <p>{KIND[r.kind]}</p>
                      <p className="mt-1 text-xs text-zinc-500">{r.bizNo}</p>
                      {r.relatedNo ? (
                        <p className="text-xs text-zinc-500">原单：{r.relatedNo}</p>
                      ) : null}
                    </div>
                  ),
                },
                { title: '成功时间', render: (r) => r.eventTime },
                {
                  title: '门店/会员',
                  render: (r) => (
                    <div>
                      {r.storeName}
                      <p className="text-xs text-zinc-500">{r.memberName || '散客'}</p>
                    </div>
                  ),
                },
                { title: '业务金额', render: (r) => formatCurrency(r.amount), align: 'right' },
                {
                  title: '外部资金',
                  render: (r) => formatCurrency(r.externalAmount),
                  align: 'right',
                },
                { title: '积分折算', render: (r) => formatCurrency(r.pointAmount), align: 'right' },
                { title: '充值赠送', render: (r) => formatCurrency(r.giftAmount), align: 'right' },
              ]}
            />
            <Pagination
              pageNum={page}
              pageSize={20}
              total={ledgerTotal}
              onChange={(p) => {
                setLedgerLoading(true);
                setPage(p);
              }}
            />
          </>
        )}
      </Card>
      {mode === 'finance' ? (
        <Card
          title="历史日结"
          extra={<span className="text-xs text-zinc-500">按上方查询范围筛选营业日</span>}
        >
          {historyError ? (
            <RequestError message={historyError} onRetry={reload} />
          ) : (
            <>
              <Table
                loading={historyLoading}
                data={history}
                rowKey={(r) => r.id}
                columns={[
                  { title: '营业日期', render: (r) => r.businessDate },
                  { title: '门店', render: (r) => r.storeName },
                  { title: '确认人', render: (r) => r.operatorName || r.createBy || '暂无' },
                  { title: '确认时间', render: (r) => r.createTime },
                  { title: '备注', render: (r) => r.remark || '暂无' },
                  {
                    title: '操作',
                    align: 'right',
                    render: (r) => (
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setDetail(null);
                          setDetailError('');
                          setDetailId(r.id);
                        }}
                      >
                        查看快照
                      </Button>
                    ),
                  },
                ]}
              />
              <Pagination
                pageNum={historyPage}
                pageSize={10}
                total={historyTotal}
                onChange={(p) => {
                  setHistoryLoading(true);
                  setHistoryPage(p);
                }}
              />
            </>
          )}
        </Card>
      ) : null}
      {settling ? (
        <SettlementDialog
          stores={filter.storeOptions}
          initialStore={filter.storeId}
          onClose={() => setSettling(false)}
          onSaved={() => {
            setSettling(false);
            reload();
          }}
        />
      ) : null}
      <Modal
        open={!!detailId}
        title="历史日结快照"
        onClose={() => setDetailId(null)}
        maxWidthClassName="max-w-6xl"
      >
        {detailError ? (
          <p role="alert" className="text-sm text-rose-600">
            {detailError}
          </p>
        ) : detail?.snapshot ? (
          <div className="space-y-4">
            <p className="text-sm">
              {detail.storeName} · {detail.businessDate} · 确认人：
              {detail.operatorName || detail.createBy} · {detail.createTime}
            </p>
            {detail.changed ? (
              <p
                role="status"
                className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200"
              >
                当前业务数据与日结时存在差异，请核对后补入交易或变动。此处展示原始快照。
              </p>
            ) : (
              <p className="text-sm text-emerald-600">当前数据与日结快照一致。</p>
            )}
            <ReportPanels report={detail.snapshot} rankings />
            {hasPermission('biz:finance:export') ? (
              <Button
                onClick={() => exportReport(detail.snapshot!, '日结快照_' + detail.businessDate)}
              >
                导出日结快照
              </Button>
            ) : null}
            <p className="text-sm text-zinc-500">备注：{detail.remark || '暂无'}</p>
          </div>
        ) : (
          <PageLoading />
        )}
      </Modal>
    </div>
  );
}
