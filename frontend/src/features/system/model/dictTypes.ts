import type { OptionNode, PageParams } from '@/types';
import type { EntityId, StatusValue } from '@/features/system/model/systemTypes';

export interface DictTypePageQuery extends PageParams {
  keywords?: string;
  tenantId?: EntityId;
}

export interface DictTypePageVO {
  id: EntityId;
  name: string;
  code: string;
  status?: StatusValue;
  groupCode?: string;
  remark?: string;
  createTime?: string;
}

export interface DictTypeFormPayload {
  id?: EntityId;
  name: string;
  code: string;
  status?: StatusValue;
  groupCode?: string | null;
  remark?: string | null;
}

export interface DictPageQuery extends PageParams {
  keywords?: string;
  typeCode?: string;
  tenantId?: EntityId;
}

export interface DictPageVO {
  id: EntityId;
  name: string;
  value: string;
  status?: StatusValue;
  sort?: number;
  remark?: string;
  createTime?: string;
}

export interface DictFormPayload {
  id?: EntityId;
  typeCode: string;
  name: string;
  value: string;
  status?: StatusValue;
  sort?: number;
  remark?: string | null;
}

/** 字典下拉项：value=字典值，label=字典名称 */
export type DictOption = OptionNode<string>;
/** 登录页租户下拉项：value=租户编码 code，label=租户名称 */
export type TenantLoginOption = OptionNode<string>;
