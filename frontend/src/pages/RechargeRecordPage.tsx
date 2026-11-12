import { getDictText } from '@/shared/lib/dict';
import { useCallback, useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { rechargeApi } from '@/shared/api/modules/rechargeApi';
import type {
  RechargeOrderDetailVO,
  RechargeOrderPageVO,
} from '@/features/recharge/model/rechargeTypes';
import { GIFT_SOURCE_LABEL, RECHARGE_PAY_METHODS, RECHARGE_STATUS } from '@/features/recharge/model/rechargeTypes';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Drawer } from '@/shared/ui/Drawer';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Input } from '@/shared/ui/Input';
import { Pagination } from '@/shared/ui/Pagination';
import { Select } from '@/shared/ui/Select';
import { StatCard } from '@/shared/ui/StatCard';
import { Table, type TableColumn } from '@/shared/ui/Table';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { formatCurrency } from '@/shared/lib/format';

const PAGE_SIZE = 10;

function payMethodLabel(r: RechargeOrderPageVO): string {
  return getDictText(r.payMethod_text);
}

function rechargeStatusBadge(status?: number) {
  const meta = status == null ? undefined : RECHARGE_STATUS[status];
  if (!meta) {
    return <Badge tone="success">已支付</Badge>;
  }
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

function RechargeDetailDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const [detail, setDetail] = useState<RechargeOrderDetailVO | null>(null);

  useEffect(() => {
    if (!id) {
      setDetail(null);
      return;
    }
    let active = true;
    rechargeApi
      .detail(id)
      .then((d) => {
        if (active) {
          setDetail(d);
        }
      })
      .catch(() => {
        if (active) {
          setDetail(null);
        }
      });
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <Drawer onClose={onClose} open={id !== null} title="充值详情" width="520px">
      {detail ? (
        <div className="space-y-4">
          <StatCard
            hint={`充值单号：${detail.rechargeNo ?? '暂无'}`}
            label="本金金额"
            tone="accent"
            value={formatCurrency(detail.principalAmount)}
          />
          <Card title="赠送与活动">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md bg-stone-50 p-3 dark:bg-zinc-900">
                <div className="text-xs text-zinc-500 dark:text-zinc-400">赠送金额</div>
                <div className="mt-1 text-lg font-semibold">{formatCurrency(detail.giftAmount)}</div>
                <div className="mt-1 text-xs text-zinc-500">
                  {GIFT_SOURCE_LABEL[detail.giftSource ?? 3] ?? '无赠送'}
                  {detail.giftFrozen === 1 ? '（冻结至次月）' : ''}
                </div>
              </div>
              <div className="rounded-md bg-stone-50 p-3 dark:bg-zinc-900">
                <div className="text-xs text-zinc-500 dark:text-zinc-400">命中活动</div>
                <div className="mt-1 text-lg font-semibold">{detail.activityName ?? '暂无'}</div>
                {detail.giftFrozen === 1 ? (
                  <div className="mt-1 text-xs text-zinc-500">
                    {detail.unfrozenTime ? `已解冻：${detail.unfrozenTime}` : '待次月解冻'}
                  </div>
                ) : null}
              </div>
            </div>
          </Card>
          <Card title="基础信息">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-500">会员</dt>
                <dd>
                  {detail.memberName ?? '暂无'}
                  {detail.memberPhone ? `（${detail.memberPhone}）` : ''}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">支付方式</dt>
                <dd>{payMethodLabel(detail)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-zinc-500">支付状态</dt>
                <dd>{rechargeStatusBadge(detail.status)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">充值门店</dt>
                <dd>{detail.storeName ?? '暂无'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">操作人</dt>
                <dd>{detail.operatorName ?? '暂无'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">充值时间</dt>
                <dd>{detail.createTime ?? '暂无'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">备注</dt>
                <dd>{detail.remark ?? '暂无'}</dd>
              </div>
            </dl>
          </Card>
        </div>
      ) : null}
    </Drawer>
  );
}

export function RechargeRecordPage() {
  const [rows, setRows] = useState<RechargeOrderPageVO[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [payMethod, setPayMethod] = useState('');
  const [status, setStatus] = useState('');
  const debounced = useDebounce(keyword, 300);
  const [detailId, setDetailId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await rechargeApi.list({
        pageNum,
        pageSize: PAGE_SIZE,
        keywords: debounced || undefined,
        payMethod: payMethod ? Number(payMethod) : undefined,
        status: status === '' ? undefined : Number(status),
      });
      setRows(data.list ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [pageNum, debounced, payMethod, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: TableColumn<RechargeOrderPageVO>[] = [
    {
      title: '充值单号',
      render: (r) => (
        <button
          className="font-medium text-salon-ink hover:text-salon-accent dark:text-zinc-100"
          onClick={() => setDetailId(String(r.id))}
          type="button"
        >
          {r.rechargeNo}
        </button>
      ),
    },
    { title: '会员', render: (r) => r.memberName ?? '暂无' },
    { title: '手机号', render: (r) => r.memberPhone ?? '暂无' },
    { title: '本金', align: 'right', render: (r) => formatCurrency(r.principalAmount) },
    {
      title: '赠送',
      align: 'right',
      render: (r) =>
        r.giftAmount > 0 ? (
          <span className="inline-flex items-center gap-1">
            {formatCurrency(r.giftAmount)}
            {r.giftFrozen === 1 ? <Badge tone="warning">冻结</Badge> : null}
          </span>
        ) : (
          '暂无'
        ),
    },
    { title: '支付方式', render: (r) => payMethodLabel(r) },
    { title: '状态', render: (r) => rechargeStatusBadge(r.status) },
    { title: '门店', render: (r) => r.storeName ?? '暂无' },
    { title: '操作人', render: (r) => r.operatorName ?? '暂无' },
    { title: '充值时间', render: (r) => r.createTime ?? '暂无' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">充值记录</h1>
        <p className="text-sm text-zinc-500">会员充值流水（本金计预收款，赠送单独记录不入营业收入）。</p>
      </div>

      <div className="rounded-lg border border-salon-line bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <Input
              className="pl-9"
              clearable
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  void load();
                }
              }}
              placeholder="充值单号/会员姓名/手机号"
              value={keyword}
            />
          </div>
          <Select className="lg:w-36" onChange={(e) => setPayMethod(e.target.value)} value={payMethod}>
            <option value="">全部支付方式</option>
            {RECHARGE_PAY_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
          <Select className="lg:w-32" onChange={(e) => setStatus(e.target.value)} value={status}>
            <option value="">全部状态</option>
            {Object.entries(RECHARGE_STATUS).map(([value, meta]) => (
              <option key={value} value={value}>
                {meta.label}
              </option>
            ))}
          </Select>
          <Button className="lg:w-24" icon={<Search className="size-4" />} onClick={load} variant="secondary">
            查询
          </Button>
        </div>
      </div>

      <Table
        columns={columns}
        data={rows}
        empty={<EmptyState title="暂无充值记录" description="还没有任何充值流水。" />}
        loading={loading}
        rowKey={(r) => r.id}
      />

      <Pagination pageNum={pageNum} pageSize={PAGE_SIZE} total={total} onChange={setPageNum} />

      <RechargeDetailDrawer id={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}
