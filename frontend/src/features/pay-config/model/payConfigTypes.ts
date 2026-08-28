import type { EntityId } from '@/features/system/model/systemTypes';

/** 支付渠道（字典 pay_channel，契约型 value 与后端一致） */
export const PAY_CHANNELS = [
  { value: 'wxpay', label: '微信支付', settleType: 'self_merchant' },
  { value: 'alipay', label: '支付宝', settleType: 'self_merchant' },
  { value: 'shouqianba', label: '收钱吧', settleType: 'aggregate_pull' },
  { value: 'saibe', label: '扫呗', settleType: 'aggregate_pull' },
  { value: 'fuzhanggui', label: '富掌柜', settleType: 'aggregate_pull' },
  { value: 'manual', label: '手动录入', settleType: 'manual' },
] as const;

export type PayChannel = (typeof PAY_CHANNELS)[number]['value'];

/** 结算模式（字典 pay_settle_type） */
export const PAY_SETTLE_TYPES: Record<string, string> = {
  self_merchant: '商户直连',
  aggregate_pull: '聚合拉单',
  manual: '手动录入',
};

/** 配置状态（字典 pay_config_status） */
export const PAY_CONFIG_STATUSES: Record<string, { label: string; tone: 'warning' | 'success' | 'danger' }> = {
  pending: { label: '待验证', tone: 'warning' },
  active: { label: '验证通过', tone: 'success' },
  invalid: { label: '验证失败', tone: 'danger' },
};

export function payChannelLabel(channel?: string): string {
  return PAY_CHANNELS.find((c) => c.value === channel)?.label ?? '未知渠道';
}

export function paySettleTypeLabel(settleType?: string): string {
  return PAY_SETTLE_TYPES[settleType ?? ''] ?? '未知模式';
}

export interface TenantPayConfigPageVO {
  id: EntityId;
  channel: string;
  /** @QueryDict 翻译字段（DictAspect 输出蛇形 _text 后缀） */
  channel_text?: string;
  settleType: string;
  settleType_text?: string;
  enabled?: number;
  appId?: string;
  mchId?: string;
  status: string;
  status_text?: string;
  remark?: string;
  updateTime?: string;
}

/** 详情（敏感字段不回显明文，编辑输入框留空=保持原值） */
export interface TenantPayConfigDetailVO {
  id: EntityId;
  channel: string;
  settleType: string;
  enabled?: number;
  appId?: string;
  mchId?: string;
  apiV3KeyTail?: string;
  apiV3KeySet?: boolean;
  certSerialNo?: string;
  privateKeySet?: boolean;
  platformPublicKeySet?: boolean;
  subMchId?: string;
  storeNo?: string;
  authTokenSet?: boolean;
  licenseObjectKey?: string;
  certObjectKey?: string;
  pullIntervalSec?: number;
  status?: string;
  remark?: string;
  updateTime?: string;
}

export interface TenantPayConfigFormPayload {
  channel: string;
  settleType: string;
  enabled?: number;
  appId?: string | null;
  mchId?: string | null;
  /** 敏感字段：新增必填（按渠道）、编辑留空=保持原值 */
  apiV3Key?: string | null;
  certSerialNo?: string | null;
  privateKey?: string | null;
  platformPublicKey?: string | null;
  subMchId?: string | null;
  storeNo?: string | null;
  authToken?: string | null;
  licenseObjectKey?: string | null;
  certObjectKey?: string | null;
  pullIntervalSec?: number | null;
  remark?: string | null;
}

export interface TenantPayConfigPageQuery {
  pageNum: number;
  pageSize: number;
  channel?: string;
  status?: string;
}

/** 验参自检结果 */
export interface TenantPayConfigVerifyVO {
  id: EntityId;
  pass: boolean;
  status: string;
  message: string;
}

/** 可用支付渠道下拉（收银台动态渲染用） */
export interface TenantPayConfigOption {
  id: EntityId;
  channel: string;
  settleType: string;
}
