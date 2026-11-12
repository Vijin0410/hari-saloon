import type { EntityId } from '@/features/system/model/systemTypes';

/** 充值活动 */
export interface RechargeActivityPageVO {
  id: EntityId;
  name: string;
  thresholdAmount: number;
  giftAmount: number;
  startTime?: string;
  endTime?: string;
  sort?: number;
  status?: number;
  status_text?: string;
  remark?: string;
  createTime?: string;
}

export interface RechargeActivityFormPayload {
  id?: EntityId;
  name: string;
  thresholdAmount: number;
  giftAmount: number;
  startTime?: string | null;
  endTime?: string | null;
  sort?: number;
  status?: number;
  remark?: string;
}

export interface RechargeActivityPageQuery {
  pageNum: number;
  pageSize: number;
  name?: string;
  status?: number;
}

export interface RechargeActivityOption {
  id: EntityId;
  name: string;
  thresholdAmount: number;
  giftAmount: number;
}

/** 充值记录 */
export interface RechargeOrderPageVO {
  id: EntityId;
  rechargeNo: string;
  memberId: EntityId;
  memberName?: string;
  memberPhone?: string;
  principalAmount: number;
  giftAmount: number;
  giftSource?: number;
  giftFrozen?: number;
  activityName?: string;
  payMethod: number;
  payMethod_text?: string;
  /** 支付状态（0=待支付 1=已支付 2=已取消） */
  status?: number;
  storeName?: string;
  operatorName?: string;
  remark?: string;
  createTime?: string;
}

export interface RechargeOrderDetailVO extends RechargeOrderPageVO {
  unfrozenTime?: string;
  payTime?: string;
  storeId?: EntityId;
  activityId?: EntityId;
}

export interface RechargeOrderPageQuery {
  pageNum: number;
  pageSize: number;
  keywords?: string;
  memberId?: EntityId;
  payMethod?: number;
  /** 支付状态（0=待支付 1=已支付 2=已取消） */
  status?: number;
  giftSource?: number;
  storeId?: EntityId;
  startTime?: string;
  endTime?: string;
}

/** 赠送预览（服务端计算口径） */
export interface RechargePreviewVO {
  activityId?: EntityId;
  activityName?: string;
  giftAmount: number;
  giftSource: number;
  giftFrozen: number;
}

export interface RechargeCreatePayload {
  memberId: EntityId;
  amount: number;
  payMethod: number;
  remark?: string;
}

/** 扫码预下单结果（直连模式：微信 code_url / 支付宝 qr_code，codeUrl 渲染二维码） */
export interface RechargePrepayVO {
  rechargeId: EntityId;
  outTradeNo: string;
  codeUrl: string;
  amount: number;
}

/** 充值单支付状态（扫码轮询） */
export interface RechargePayStatusVO {
  rechargeId: EntityId;
  status: number;
  payTime?: string;
}

/** 赠送来源文案 */
export const GIFT_SOURCE_LABEL: Record<number, string> = {
  1: '充值活动',
  2: '等级赠送',
  3: '无赠送',
};

/** 充值单支付状态（后端 salon_recharge_order.status）：label + Badge tone */
export const RECHARGE_STATUS: Record<number, { label: string; tone: 'warning' | 'success' | 'neutral' }> = {
  0: { label: '待支付', tone: 'warning' },
  1: { label: '已支付', tone: 'success' },
  2: { label: '已取消', tone: 'neutral' },
};

/** 充值可用支付方式（字典 pay_method：不允许余额/积分） */
export const RECHARGE_PAY_METHODS: Array<{ value: number; label: string }> = [
  { value: 1, label: '现金' },
  { value: 2, label: '微信' },
  { value: 3, label: '支付宝' },
  { value: 4, label: '银行卡' },
  { value: 8, label: '其他' },
];
