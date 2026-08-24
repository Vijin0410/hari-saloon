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
  changeAmount: number;
  status: OrderStatus;
  statusLabel?: string;
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
  payMethodLabel?: string;
  amount: number;
}

export interface OrderDetailVO extends OrderPageVO {
  storeId?: EntityId;
  pointDeductPoints?: number;
  items: OrderItemVO[];
  payments: OrderPaymentVO[];
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
