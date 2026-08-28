import { get, post, put, deleteRequest } from '@/shared/api/client';
import type { PageData } from '@/types';
import type {
  RechargeActivityFormPayload,
  RechargeActivityOption,
  RechargeActivityPageQuery,
  RechargeActivityPageVO,
  RechargeCreatePayload,
  RechargeOrderDetailVO,
  RechargeOrderPageQuery,
  RechargeOrderPageVO,
  RechargePayStatusVO,
  RechargePrepayVO,
  RechargePreviewVO,
} from '@/features/recharge/model/rechargeTypes';
import type { EntityId } from '@/features/system/model/systemTypes';

export const rechargeActivityApi = {
  list(params: RechargeActivityPageQuery): Promise<PageData<RechargeActivityPageVO>> {
    return get<PageData<RechargeActivityPageVO>>('/v1/recharge-activities/page', { params });
  },
  form(id: EntityId): Promise<RechargeActivityFormPayload> {
    return get<RechargeActivityFormPayload>(`/v1/recharge-activities/${id}/form`);
  },
  create(payload: RechargeActivityFormPayload): Promise<EntityId> {
    return post<EntityId, RechargeActivityFormPayload>('/v1/recharge-activities/add', payload);
  },
  update(id: EntityId, payload: RechargeActivityFormPayload): Promise<void> {
    return put<void, RechargeActivityFormPayload>(`/v1/recharge-activities/${id}/update`, payload);
  },
  remove(ids: EntityId[]): Promise<void> {
    return deleteRequest<void>('/v1/recharge-activities/delete', { params: { ids: ids.join(',') } });
  },
  options(): Promise<RechargeActivityOption[]> {
    return get<RechargeActivityOption[]>('/v1/recharge-activities/options');
  },
};

export const rechargeApi = {
  list(params: RechargeOrderPageQuery): Promise<PageData<RechargeOrderPageVO>> {
    return get<PageData<RechargeOrderPageVO>>('/v1/recharges/page', { params });
  },
  detail(id: EntityId): Promise<RechargeOrderDetailVO> {
    return get<RechargeOrderDetailVO>(`/v1/recharges/${id}/detail`);
  },
  preview(memberId: EntityId, amount: number): Promise<RechargePreviewVO> {
    return get<RechargePreviewVO>('/v1/recharges/preview', { params: { memberId, amount } });
  },
  create(payload: RechargeCreatePayload): Promise<EntityId> {
    return post<EntityId, RechargeCreatePayload>('/v1/recharges/add', payload);
  },
  /** 扫码预下单（直连模式 wxpay/alipay，返回 codeUrl 渲染二维码） */
  scanPrepay(channel: 'wxpay' | 'alipay', payload: RechargeCreatePayload): Promise<RechargePrepayVO> {
    return post<RechargePrepayVO, RechargeCreatePayload>(`/v1/recharges/${channel}/prepay`, payload);
  },
  /** 充值单支付状态（扫码轮询） */
  payStatus(id: EntityId): Promise<RechargePayStatusVO> {
    return get<RechargePayStatusVO>(`/v1/recharges/${id}/pay-status`);
  },
  /** 取消待支付充值单（扫码支付放弃时关闭单据） */
  cancel(id: EntityId): Promise<void> {
    return post<void, Record<string, never>>(`/v1/recharges/${id}/cancel`, {});
  },
};
