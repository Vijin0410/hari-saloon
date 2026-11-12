import type { EntityId } from '@/features/system/model/systemTypes';

/** 订单 */
export type OrderStatus = 0 | 1 | 2 | 3 | 4;

export interface OrderPageVO {
  id: EntityId;
  orderNo: string;
  memberId?: EntityId;
  memberName?: string;
  memberPhone?: string;
  itemAmount: number;
  discountAmount: number;
  payableAmount: number;
  pointDeductAmount: number;
  receivedAmount: number;
  /** 累计已退款金额（成功退款单汇总；可退=实收-已退） */
  refundedAmount: number;
  changeAmount: number;
  status: OrderStatus;
  status_text?: string;
  storeName?: string;
  remark?: string;
  createTime?: string;
  paidTime?: string;
}

export interface OrderItemVO {
  id: EntityId;
  itemType: number;
  itemId: EntityId;
  itemName: string;
  unitPrice: number;
  price: number;
  quantity: number;
  discountRate: number;
  subtotal: number;
  staffId?: EntityId;
  assistantId?: EntityId;
  staffName?: string;
  assistantName?: string;
  remark?: string;
}

export interface OrderPaymentVO {
  id: EntityId;
  payMethod: number;
  payMethod_text?: string;
  amount: number;
}

export interface OrderDetailVO extends OrderPageVO {
  storeId?: EntityId;
  pointDeductPoints?: number;
  items: OrderItemVO[];
  payments: OrderPaymentVO[];
  /** 退款记录（时间倒序，含分摊明细） */
  refunds?: OrderRefundVO[];
}

export interface OrderPageQuery {
  pageNum: number;
  pageSize: number;
  keywords?: string;
  memberId?: EntityId;
  status?: number;
  storeId?: EntityId;
  startTime?: string;
  endTime?: string;
}

/** 开单/挂单 */
export interface OrderItemPayload {
  itemType: number;
  itemId: EntityId;
  price: number;
  quantity: number;
  staffId?: EntityId;
  assistantId?: EntityId;
  remark?: string;
}

export interface OrderSavePayload {
  memberId?: EntityId | null;
  storeId: EntityId;
  remark?: string;
  items: OrderItemPayload[];
}

/** 结算 */
export interface OrderPaymentPayload {
  payMethod: number;
  amount: number;
}

export interface OrderPayPayload {
  usePoints: number;
  cashReceived: number;
  payments: OrderPaymentPayload[];
}

/** 订单扫码预下单结果（收银台渲染二维码 + 轮询订单状态） */
export interface OrderPrepayVO {
  orderId: EntityId;
  outTradeNo: string;
  codeUrl: string;
  amount: number;
}

/** 退款分摊明细行 */
export interface OrderRefundPaymentVO {
  id: EntityId;
  payMethod: number;
  payMethod_text?: string;
  amount: number;
  /** 退款渠道（wxpay/alipay 原路退回；空=系统内退回/线下退款） */
  channel?: string;
  channel_text?: string;
  channelRefundNo?: string;
  /** 退款处理状态（processing/success/failed） */
  channelStatus: string;
  feeAmount?: number;
  feeReturned?: number;
  remark?: string;
}

/** 退款记录 */
export interface OrderRefundVO {
  id: EntityId;
  refundNo: string;
  orderId: EntityId;
  orderNo?: string;
  refundAmount: number;
  pointRefundPoints?: number;
  pointClawbackPoints?: number;
  pointClawbackDeducted?: number;
  pointClawbackExpired?: number;
  pointClawbackDebt?: number;
  pointRefundAmount?: number;
  balanceRefundAmount?: number;
  reason?: string;
  /** 退款单状态（0=处理中 1=成功 2=失败） */
  status: number;
  successTime?: string;
  remark?: string;
  createBy?: EntityId;
  createTime?: string;
  payments: OrderRefundPaymentVO[];
}

/** 退款发起表单 */
export interface OrderRefundPayload {
  refundAmount: number;
  reason: string;
}

/** 退款单状态文案（后端 salon_refund_order.status） */
export const REFUND_STATUS_LABEL: Record<number, string> = {
  0: '处理中',
  1: '已退款',
  2: '退款失败',
};

/** 退款分摊渠道状态文案（salon_refund_payment.channel_status） */
export const REFUND_CHANNEL_STATUS_LABEL: Record<string, string> = {
  processing: '处理中',
  success: '已生效',
  failed: '失败',
};

/** 订单支付状态（扫码轮询） */
export interface OrderPayStatusVO {
  orderId: EntityId;
  status: OrderStatus;
  status_text?: string;
  paidTime?: string;
}

/** 订单状态文案（后端字典 order_status 翻译兜底） */
export const ORDER_STATUS_LABEL: Record<number, string> = {
  0: '挂单',
  1: '已支付',
  2: '部分退款',
  3: '已退款',
  4: '已取消',
};

/** 订单可用支付方式（字典 pay_method；赠送余额由余额支付内部先扣） */
export const ORDER_PAY_METHODS: Array<{ value: number; label: string }> = [
  { value: 1, label: '现金' },
  { value: 2, label: '微信' },
  { value: 3, label: '支付宝' },
  { value: 4, label: '银行卡' },
  { value: 5, label: '会员余额' },
  { value: 8, label: '其他' },
];

/** 积分抵扣比例：100积分=1元（与后端一致） */
export const POINTS_PER_YUAN = 100;
