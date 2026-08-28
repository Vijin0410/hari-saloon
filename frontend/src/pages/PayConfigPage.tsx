import { useCallback, useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Plus, RefreshCw, ShieldCheck, Trash2, Upload, XCircle } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { payConfigApi } from '@/shared/api/modules/payConfigApi';
import { fileApi } from '@/shared/api/modules/systemApi';
import type { EntityId } from '@/features/system/model/systemTypes';
import {
  PAY_CHANNELS,
  PAY_CONFIG_STATUSES,
  PAY_SETTLE_TYPES,
  payChannelLabel,
  paySettleTypeLabel,
  type TenantPayConfigDetailVO,
  type TenantPayConfigFormPayload,
  type TenantPayConfigPageVO,
  type TenantPayConfigVerifyVO,
} from '@/features/pay-config/model/payConfigTypes';
import { buildPayConfigSchema, type PayConfigFormValues } from '@/features/pay-config/model/payConfigSchemas';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Field } from '@/shared/ui/Field';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { PageLoading } from '@/shared/ui/PageLoading';
import { Pagination } from '@/shared/ui/Pagination';
import { Select } from '@/shared/ui/Select';
import { Table, type TableColumn } from '@/shared/ui/Table';
import { Textarea } from '@/shared/ui/Textarea';
import { useAuthStore } from '@/store/useAuthStore';

const PAGE_SIZE = 10;

type FormMode = 'create' | 'edit';

function defaultValues(): PayConfigFormValues {
  return {
    channel: 'wxpay',
    settleType: 'self_merchant',
    enabled: 1,
    appId: '',
    mchId: '',
    apiV3Key: '',
    certSerialNo: '',
    privateKey: '',
    platformPublicKey: '',
    subMchId: '',
    storeNo: '',
    authToken: '',
    licenseObjectKey: '',
    certObjectKey: '',
    pullIntervalSec: '',
    remark: '',
  };
}

function toPayload(v: PayConfigFormValues): TenantPayConfigFormPayload {
  const blankToNull = (s: string): string | null => (s.trim() ? s.trim() : null);
  return {
    channel: v.channel,
    settleType: v.settleType,
    enabled: v.enabled,
    appId: blankToNull(v.appId),
    mchId: blankToNull(v.mchId),
    apiV3Key: blankToNull(v.apiV3Key),
    certSerialNo: blankToNull(v.certSerialNo),
    privateKey: blankToNull(v.privateKey),
    platformPublicKey: blankToNull(v.platformPublicKey),
    subMchId: blankToNull(v.subMchId),
    storeNo: blankToNull(v.storeNo),
    authToken: blankToNull(v.authToken),
    licenseObjectKey: blankToNull(v.licenseObjectKey),
    certObjectKey: blankToNull(v.certObjectKey),
    pullIntervalSec: v.pullIntervalSec ? Number(v.pullIntervalSec) : null,
    remark: blankToNull(v.remark),
  };
}

function toFormValues(d: TenantPayConfigDetailVO): PayConfigFormValues {
  return {
    channel: d.channel as PayConfigFormValues['channel'],
    settleType: d.settleType as PayConfigFormValues['settleType'],
    enabled: (d.enabled ?? 1) as 0 | 1,
    appId: d.appId ?? '',
    mchId: d.mchId ?? '',
    // 敏感字段不回显明文：留空提交 = 保持原值
    apiV3Key: '',
    certSerialNo: d.certSerialNo ?? '',
    privateKey: '',
    platformPublicKey: '',
    subMchId: d.subMchId ?? '',
    storeNo: d.storeNo ?? '',
    authToken: '',
    licenseObjectKey: d.licenseObjectKey ?? '',
    certObjectKey: d.certObjectKey ?? '',
    pullIntervalSec: d.pullIntervalSec != null ? String(d.pullIntervalSec) : '',
    remark: d.remark ?? '',
  };
}

/** 敏感输入框占位提示（编辑已配置时提示留空保持） */
function secretPlaceholder(label: string, isCreate: boolean, configured: boolean, tail?: string): string {
  if (isCreate) {
    return `请输入${label}`;
  }
  if (configured) {
    return tail ? `已配置（尾4位 ${tail}），留空保持原值` : '已配置，留空保持原值';
  }
  return `尚未配置，填写${label}后保存`;
}

/** 证照/证书文件上传（MinIO 私有桶，objectKey 存配置表） */
function UploadField({
  accept,
  disabled,
  label,
  objectKey,
  onChange,
}: {
  accept: string;
  disabled?: boolean;
  label: string;
  objectKey: string;
  onChange: (objectKey: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const vo = await fileApi.upload(file, 'pay-config');
      onChange(vo.objectKey);
    } catch (e) {
      setError(e instanceof Error ? e.message : '上传失败');
    } finally {
      setUploading(false);
    }
  }

  return (
    <Field hint={objectKey ? '已上传，重新选择文件可覆盖' : '支持 jpg/png/pdf，最大 10MB'} label={label}>
      <div className="flex items-center gap-2">
        <label
          className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-salon-line bg-white px-3 text-sm text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          <Upload className="size-4" />
          {uploading ? '上传中…' : '选择文件'}
          <input accept={accept} className="hidden" disabled={disabled || uploading} onChange={handleFile} type="file" />
        </label>
        {objectKey ? (
          <Badge tone="success">已上传</Badge>
        ) : (
          <span className="text-xs text-zinc-400">未上传</span>
        )}
      </div>
      {error ? <span className="block text-xs text-rose-600 dark:text-rose-300">{error}</span> : null}
    </Field>
  );
}

function PayConfigFormDialog({
  mode,
  editId,
  onClose,
  onSaved,
}: {
  mode: FormMode;
  editId: string | null;
  onClose: () => void;
  onSaved: (id: EntityId) => void;
}) {
  const isCreate = mode === 'create';
  const [loadingForm, setLoadingForm] = useState(false);
  const [detail, setDetail] = useState<TenantPayConfigDetailVO | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
    reset,
    setValue,
    watch,
  } = useForm<PayConfigFormValues>({
    resolver: zodResolver(buildPayConfigSchema(isCreate)),
    defaultValues: defaultValues(),
  });

  const channel = watch('channel');
  const licenseObjectKey = watch('licenseObjectKey');
  const certObjectKey = watch('certObjectKey');

  useEffect(() => {
    if (!isCreate && editId) {
      let active = true;
      setLoadingForm(true);
      payConfigApi
        .detail(editId)
        .then((payload) => {
          if (active) {
            setDetail(payload);
            reset(toFormValues(payload));
          }
        })
        .finally(() => {
          if (active) {
            setLoadingForm(false);
          }
        });
      return () => {
        active = false;
      };
    }
    reset(defaultValues());
    return undefined;
  }, [isCreate, editId, reset]);

  // 渠道切换时联动结算模式（渠道与模式一一对应）
  useEffect(() => {
    const expected = PAY_CHANNELS.find((c) => c.value === channel)?.settleType;
    if (expected) {
      setValue('settleType', expected);
    }
  }, [channel, setValue]);

  async function handleSave(values: PayConfigFormValues): Promise<void> {
    setSubmitLoading(true);
    try {
      const payload = toPayload(values);
      if (isCreate) {
        const id = await payConfigApi.create(payload);
        onSaved(id);
      } else if (editId) {
        await payConfigApi.update(editId, payload);
        onSaved(editId);
      }
      onClose();
    } finally {
      setSubmitLoading(false);
    }
  }

  const isWxpay = channel === 'wxpay';
  const isAlipay = channel === 'alipay';
  const isAggregate = channel === 'shouqianba' || channel === 'saibe' || channel === 'fuzhanggui';
  const isManual = channel === 'manual';

  return (
    <Modal
      description="商户自行在微信/支付宝/聚合服务商申请的参数；敏感字段加密存储，保存后自动验参自检。"
      footer={
        <>
          <Button onClick={onClose} variant="secondary">
            取消
          </Button>
          <Button loading={submitLoading} onClick={handleSubmit(handleSave)}>
            保存
          </Button>
        </>
      }
      onClose={onClose}
      open
      title={isCreate ? '新增支付配置' : `编辑支付配置（${payChannelLabel(channel)}）`}
    >
      {loadingForm ? (
        <PageLoading />
      ) : (
        <form className="grid gap-3 md:grid-cols-2" onSubmit={handleSubmit(handleSave)}>
          <Field error={errors.channel?.message} label="支付渠道" required>
            <Select disabled={!isCreate} {...register('channel')}>
              {PAY_CHANNELS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field error={errors.settleType?.message} hint="结算模式由渠道决定" label="结算模式" required>
            <Select disabled {...register('settleType')}>
              {Object.entries(PAY_SETTLE_TYPES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>

          {isManual ? (
            <p className="text-sm text-zinc-500 md:col-span-2">
              手动录入兜底渠道：收银员在收银台手输金额确认，无需渠道参数；保存后自动置为验证通过。
            </p>
          ) : null}

          {isWxpay ? (
            <>
              <Field error={errors.appId?.message} label="AppID" required={isCreate}>
                <Input
                  invalid={Boolean(errors.appId)}
                  placeholder="与商户号绑定的公众号/小程序 AppID"
                  {...register('appId')}
                />
              </Field>
              <Field error={errors.mchId?.message} label="商户号（mch_id）" required={isCreate}>
                <Input
                  invalid={Boolean(errors.mchId)}
                  placeholder="微信支付商户平台商户号"
                  {...register('mchId')}
                />
              </Field>
              <Field
                error={errors.apiV3Key?.message}
                label="APIv3 密钥"
                required={isCreate}
              >
                <Input
                  invalid={Boolean(errors.apiV3Key)}
                  placeholder={secretPlaceholder('32位APIv3密钥', isCreate, Boolean(detail?.apiV3KeySet), detail?.apiV3KeyTail)}
                  type="password"
                  {...register('apiV3Key')}
                />
              </Field>
              <Field error={errors.certSerialNo?.message} label="商户证书序列号" required={isCreate}>
                <Input
                  invalid={Boolean(errors.certSerialNo)}
                  placeholder="商户平台 API 安全序列号"
                  {...register('certSerialNo')}
                />
              </Field>
              <Field className="md:col-span-2" error={errors.privateKey?.message} label="商户私钥（apiclient_key.pem）" required={isCreate}>
                <Textarea
                  className="font-mono text-xs"
                  invalid={Boolean(errors.privateKey)}
                  placeholder={secretPlaceholder('私钥 PEM 全文', isCreate, Boolean(detail?.privateKeySet))}
                  rows={4}
                  {...register('privateKey')}
                />
              </Field>
            </>
          ) : null}

          {isAlipay ? (
            <>
              <Field error={errors.appId?.message} label="应用 AppID" required={isCreate}>
                <Input invalid={Boolean(errors.appId)} placeholder="支付宝开放平台应用ID" {...register('appId')} />
              </Field>
              <Field error={errors.mchId?.message} label="合作者身份ID（PID）" required={isCreate}>
                <Input invalid={Boolean(errors.mchId)} placeholder="支付宝合作伙伴身份ID（2088 开头）" {...register('mchId')} />
              </Field>
              <Field className="md:col-span-2" error={errors.privateKey?.message} label="应用私钥" required={isCreate}>
                <Textarea
                  className="font-mono text-xs"
                  invalid={Boolean(errors.privateKey)}
                  placeholder={secretPlaceholder('应用私钥', isCreate, Boolean(detail?.privateKeySet))}
                  rows={4}
                  {...register('privateKey')}
                />
              </Field>
              <Field className="md:col-span-2" error={errors.platformPublicKey?.message} label="支付宝公钥" required={isCreate}>
                <Textarea
                  className="font-mono text-xs"
                  invalid={Boolean(errors.platformPublicKey)}
                  placeholder={secretPlaceholder('支付宝公钥', isCreate, Boolean(detail?.platformPublicKeySet))}
                  rows={4}
                  {...register('platformPublicKey')}
                />
              </Field>
            </>
          ) : null}

          {isAggregate ? (
            <>
              <Field error={errors.subMchId?.message} label="服务商商户号" required={isCreate}>
                <Input invalid={Boolean(errors.subMchId)} placeholder="聚合服务商商户号/子商户号" {...register('subMchId')} />
              </Field>
              <Field error={errors.storeNo?.message} label="门店号/终端号">
                <Input placeholder="可选，服务商门店/终端编号" {...register('storeNo')} />
              </Field>
              <Field className="md:col-span-2" error={errors.authToken?.message} label="开放平台授权 token" required={isCreate}>
                <Textarea
                  className="font-mono text-xs"
                  invalid={Boolean(errors.authToken)}
                  placeholder={secretPlaceholder('授权 token', isCreate, Boolean(detail?.authTokenSet))}
                  rows={3}
                  {...register('authToken')}
                />
              </Field>
              <Field error={errors.pullIntervalSec?.message} label="拉单间隔（秒）">
                <Controller
                  control={control}
                  name="pullIntervalSec"
                  render={({ field }) => (
                    <Input
                      inputMode="numeric"
                      invalid={Boolean(errors.pullIntervalSec)}
                      placeholder="如 120（30-3600）"
                      value={field.value ?? ''}
                      onBlur={field.onBlur}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === '' || /^\d{1,4}$/.test(v)) {
                          field.onChange(v);
                        }
                      }}
                    />
                  )}
                />
              </Field>
            </>
          ) : null}

          {!isManual ? (
            <>
              <UploadField
                accept=".jpg,.jpeg,.png,.pdf"
                label="营业执照（存档）"
                objectKey={licenseObjectKey}
                onChange={(key) => setValue('licenseObjectKey', key)}
              />
              <UploadField
                accept=".p12,.pem,.txt"
                label="证书文件（可选）"
                objectKey={certObjectKey}
                onChange={(key) => setValue('certObjectKey', key)}
              />
            </>
          ) : null}

          <Field label="是否启用">
            <Select {...register('enabled', { valueAsNumber: true })}>
              <option value={1}>启用</option>
              <option value={0}>停用</option>
            </Select>
          </Field>
          <Field className="md:col-span-2" error={errors.remark?.message} label="备注">
            <Input placeholder="配置备注（可选）" {...register('remark')} />
          </Field>
          <button className="hidden" type="submit" />
        </form>
      )}
    </Modal>
  );
}

function VerifyResultDialog({
  result,
  onClose,
  onRefresh,
  onResult,
}: {
  result: TenantPayConfigVerifyVO | null;
  onClose: () => void;
  onRefresh: () => void;
  onResult: (result: TenantPayConfigVerifyVO) => void;
}) {
  const [verifying, setVerifying] = useState(false);
  const status = result ? PAY_CONFIG_STATUSES[result.status] : undefined;
  return (
    <Modal
      description="保存即自检：微信直连调微信支付 V3 只读接口验证商户号/证书序列号/私钥；其余渠道暂为本地完整性校验。"
      footer={
        <>
          <Button onClick={onClose} variant="secondary">
            关闭
          </Button>
          {result ? (
            <Button
              icon={<RefreshCw className="size-4" />}
              loading={verifying}
              onClick={async () => {
                if (!result) {
                  return;
                }
                setVerifying(true);
                try {
                  const next = await payConfigApi.verify(result.id);
                  onResult(next);
                  onRefresh();
                } finally {
                  setVerifying(false);
                }
              }}
              variant="secondary"
            >
              重新验证
            </Button>
          ) : null}
        </>
      }
      onClose={onClose}
      open={Boolean(result)}
      title="验参自检结果"
    >
      {result ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            {result.pass ? (
              <CheckCircle2 className="size-5 text-emerald-500" />
            ) : (
              <XCircle className="size-5 text-rose-500" />
            )}
            <Badge tone={status?.tone ?? 'neutral'}>{status?.label ?? result.status}</Badge>
          </div>
          <p className="text-sm text-zinc-700 dark:text-zinc-200">{result.message}</p>
        </div>
      ) : null}
    </Modal>
  );
}

export function PayConfigPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [rows, setRows] = useState<TenantPayConfigPageVO[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [channel, setChannel] = useState('');
  const [status, setStatus] = useState('');
  const [editMode, setEditMode] = useState<FormMode | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [confirmIds, setConfirmIds] = useState<string[] | null>(null);
  const [verifyResult, setVerifyResult] = useState<TenantPayConfigVerifyVO | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await payConfigApi.list({
        pageNum,
        pageSize: PAGE_SIZE,
        channel: channel || undefined,
        status: status || undefined,
      });
      setRows(data.list ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [pageNum, channel, status]);

  useEffect(() => {
    void load();
  }, [load]);

  /** 保存后自动触发验参自检，并刷新列表（verify 会更新状态） */
  const handleSaved = useCallback(
    async (id: EntityId) => {
      await load();
      try {
        const result = await payConfigApi.verify(id);
        setVerifyResult(result);
        await load();
      } catch {
        // 验参请求失败（网络/权限）不阻断保存结果，列表已刷新
      }
    },
    [load],
  );

  async function handleVerify(id: EntityId): Promise<void> {
    const result = await payConfigApi.verify(id);
    setVerifyResult(result);
    await load();
  }

  const columns: TableColumn<TenantPayConfigPageVO>[] = [
    {
      title: '支付渠道',
      render: (r) => <span className="font-medium">{r.channel_text ?? payChannelLabel(r.channel)}</span>,
    },
    {
      title: '结算模式',
      render: (r) => <span>{r.settleType_text ?? paySettleTypeLabel(r.settleType)}</span>,
    },
    {
      title: '商户号/AppID',
      render: (r) => (
        <span className="text-zinc-500">{r.mchId || r.appId || '—'}</span>
      ),
    },
    {
      title: '启用',
      render: (r) => (
        <Badge tone={r.enabled === 1 ? 'success' : 'neutral'}>{r.enabled === 1 ? '启用' : '停用'}</Badge>
      ),
    },
    {
      title: '状态',
      render: (r) => {
        const s = PAY_CONFIG_STATUSES[r.status];
        return <Badge tone={s?.tone ?? 'neutral'}>{s?.label ?? r.status}</Badge>;
      },
    },
    {
      title: '更新时间',
      render: (r) => <span className="text-zinc-500">{r.updateTime ?? '—'}</span>,
    },
    {
      title: '操作',
      align: 'right',
      render: (r) => (
        <div className="flex justify-end gap-2">
          {hasPermission('biz:pay:config:verify') ? (
            <Button
              icon={<ShieldCheck className="size-4" />}
              onClick={() => void handleVerify(r.id)}
              size="sm"
              variant="secondary"
            >
              验证
            </Button>
          ) : null}
          {hasPermission('biz:pay:config:edit') ? (
            <Button
              onClick={() => {
                setEditMode('edit');
                setEditId(String(r.id));
              }}
              size="sm"
              variant="secondary"
            >
              编辑
            </Button>
          ) : null}
          {hasPermission('biz:pay:config:delete') ? (
            <Button
              icon={<Trash2 className="size-4" />}
              onClick={() => setConfirmIds([String(r.id)])}
              size="sm"
              variant="secondary"
            >
              删除
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">支付配置</h1>
          <p className="text-sm text-zinc-500">
            配置商户自己的微信/支付宝/聚合收款参数；敏感字段加密存储，保存后自动验参自检，验证通过的渠道才在收银台生效。
          </p>
        </div>
        {hasPermission('biz:pay:config:add') ? (
          <Button
            icon={<Plus className="size-4" />}
            onClick={() => {
              setEditMode('create');
              setEditId(null);
            }}
          >
            新增配置
          </Button>
        ) : null}
      </div>

      <div className="rounded-lg border border-salon-line bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-44">
            <Select
              onChange={(e) => {
                setPageNum(1);
                setChannel(e.target.value);
              }}
              value={channel}
            >
              <option value="">全部渠道</option>
              {PAY_CHANNELS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-44">
            <Select
              onChange={(e) => {
                setPageNum(1);
                setStatus(e.target.value);
              }}
              value={status}
            >
              <option value="">全部状态</option>
              {Object.entries(PAY_CONFIG_STATUSES).map(([value, s]) => (
                <option key={value} value={value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      <Table
        columns={columns}
        data={rows}
        empty={
          <EmptyState
            description="尚未配置任何支付渠道；无渠道参数时收银台以手动录入兜底。"
            title="暂无支付配置"
          />
        }
        loading={loading}
        rowKey={(r) => r.id}
      />

      <Pagination pageNum={pageNum} pageSize={PAGE_SIZE} total={total} onChange={setPageNum} />

      {editMode !== null ? (
        <PayConfigFormDialog
          editId={editId}
          mode={editMode}
          onClose={() => {
            setEditMode(null);
            setEditId(null);
          }}
          onSaved={(id) => void handleSaved(id)}
        />
      ) : null}

      <VerifyResultDialog
        onClose={() => setVerifyResult(null)}
        onRefresh={() => void load()}
        onResult={setVerifyResult}
        result={verifyResult}
      />

      <ConfirmDialog
        danger
        description="删除后该渠道不可用于收款，恢复需重新配置并验证。"
        onCancel={() => setConfirmIds(null)}
        onConfirm={() => {
          if (!confirmIds) {
            return;
          }
          void payConfigApi.remove(confirmIds).then(async () => {
            setConfirmIds(null);
            await load();
          });
        }}
        open={Boolean(confirmIds)}
        title="确认删除支付配置"
      />
    </div>
  );
}
