import type { EntityId } from '@/features/system/model/systemTypes';

/** 商品分类 */
export interface GoodsCategoryPageVO {
  id: EntityId;
  name: string;
  sort?: number;
  status?: number;
  remark?: string;
  createTime?: string;
}

export interface GoodsCategoryFormPayload {
  id?: EntityId;
  name: string;
  sort?: number;
  status?: number;
  remark?: string;
}

export interface GoodsCategoryPageQuery {
  pageNum: number;
  pageSize: number;
  name?: string;
  status?: number;
}

export interface GoodsCategoryOption {
  id: EntityId;
  name: string;
}

/** 商品 */
export interface GoodsPageVO {
  id: EntityId;
  name: string;
  categoryId?: EntityId;
  barcode?: string;
  salePrice?: number;
  costPrice?: number;
  stockQuantity?: number;
  discountable?: number;
  commissionable?: number;
  sort?: number;
  status?: number;
  createTime?: string;
}

export interface GoodsFormPayload {
  id?: EntityId;
  name: string;
  categoryId?: EntityId;
  barcode?: string;
  salePrice: number;
  costPrice?: number;
  stockQuantity?: number;
  discountable?: number;
  commissionable?: number;
  sort?: number;
  status?: number;
  remark?: string;
}

export interface GoodsPageQuery {
  pageNum: number;
  pageSize: number;
  name?: string;
  categoryId?: EntityId;
  status?: number;
}

export interface GoodsOption {
  id: EntityId;
  name: string;
  categoryId?: EntityId;
  salePrice?: number;
  stockQuantity?: number;
}
