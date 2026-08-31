import { get, post, put } from '@/shared/api/client';
import type { PageData } from '@/types';
import type {
  OrderDetailVO,
  OrderPageQuery,
  OrderPageVO,
  OrderPayPayload,
  OrderPayStatusVO,
  OrderPrepayVO,
  OrderSavePayload,
} from '@/features/order/model/orderTypes';
import type { EntityId } from '@/features/system/model/systemTypes';

export const orderApi = {
  list(params: OrderPageQuery): Promise<PageData<OrderPageVO>> {
    return get<PageData<OrderPageVO>>('/v1/orders/page', { params });
  },
  detail(id: EntityId): Promise<OrderDetailVO> {
    return get<OrderDetailVO>(`/v1/orders/${id}/detail`);
  },
  /** 开单挂单，返回订单ID（结算=save 后紧接 pay） */
  save(payload: OrderSavePayload): Promise<EntityId> {
    return post<EntityId, OrderSavePayload>('/v1/orders/add', payload);
  },
  update(id: EntityId, payload: OrderSavePayload): Promise<void> {
    return put<void, OrderSavePayload>(`/v1/orders/${id}/update`, payload);
  },
  pay(id: EntityId, payload: OrderPayPayload): Promise<EntityId> {
    return post<EntityId, OrderPayPayload>(`/v1/orders/${id}/pay`, payload);
  },
  /** 扫码预下单（组合支付含微信/支付宝行时出码；确认结算由回调驱动） */
  prepay(id: EntityId, payload: OrderPayPayload): Promise<OrderPrepayVO> {
    return post<OrderPrepayVO, OrderPayPayload>(`/v1/orders/${id}/prepay`, payload);
  },
  /** 取消扫码支付（关流水，订单保持挂单） */
  cancelPrepay(id: EntityId): Promise<void> {
    return post<void, unknown>(`/v1/orders/${id}/prepay-cancel`, {});
  },
  /** 订单支付状态（扫码轮询） */
  payStatus(id: EntityId): Promise<OrderPayStatusVO> {
    return get<OrderPayStatusVO>(`/v1/orders/${id}/pay-status`);
  },
  cancel(id: EntityId): Promise<void> {
    return post<void, unknown>(`/v1/orders/${id}/cancel`, {});
  },
  },
  },
};
