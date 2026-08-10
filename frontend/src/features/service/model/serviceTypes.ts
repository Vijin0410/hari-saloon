import type { EntityId } from '@/features/system/model/systemTypes';

/** 服务项目分类 */
export interface ServiceCategoryPageVO {
  id: EntityId;
  name: string;
  sort?: number;
  status?: number;
  remark?: string;
  createTime?: string;
}

export interface ServiceCategoryFormPayload {
  id?: EntityId;
  name: string;
  sort?: number;
  status?: number;
  remark?: string;
}

export interface ServiceCategoryPageQuery {
  pageNum: number;
  pageSize: number;
  name?: string;
  status?: number;
}

export interface ServiceCategoryOption {
  id: EntityId;
  name: string;
}

/** 服务项目 */
export interface ServiceItemPageVO {
  id: EntityId;
  name: string;
  categoryId?: EntityId;
  standardPrice?: number;
  memberPrice?: number;
  duration?: number;
  discountable?: number;
  commissionable?: number;
  sort?: number;
  status?: number;
  createTime?: string;
}

export interface ServiceItemFormPayload {
  id?: EntityId;
  name: string;
  categoryId?: EntityId;
  standardPrice: number;
  memberPrice?: number;
  duration?: number;
  discountable?: number;
  commissionable?: number;
  sort?: number;
  status?: number;
  remark?: string;
}

export interface ServiceItemPageQuery {
  pageNum: number;
  pageSize: number;
  name?: string;
  categoryId?: EntityId;
  status?: number;
}

export interface ServiceItemOption {
  id: EntityId;
  name: string;
  categoryId?: EntityId;
  standardPrice?: number;
  memberPrice?: number;
  duration?: number;
}
