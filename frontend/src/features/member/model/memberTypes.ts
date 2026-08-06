import type { EntityId } from '@/features/system/model/systemTypes';

/** 会员分页 */
export interface MemberPageVO {
  id: EntityId;
  name: string;
  phone?: string;
  gender?: number;
  birthday?: string;
  levelId?: EntityId;
  levelName?: string;
  balance?: number;
  points?: number;
  source?: string;
  status?: number;
  storeId?: EntityId;
  storeName?: string;
  tagNames?: string[];
  remark?: string;
  createTime?: string;
}

/** 会员余额明细 */
export interface MemberBalanceVO {
  principalBalance?: number;
  giftBalance?: number;
  frozenBalance?: number;
  availableBalance?: number;
  lastRechargeTime?: string;
  lastConsumeTime?: string;
}

/** 会员标签选项 */
export interface MemberTagOption {
  id: EntityId;
  name: string;
  color?: string;
}

/** 会员结构化备注 */
export interface MemberProfileVO {
  hairQuality?: string;
  preferredStyle?: string;
  preferredStylistId?: EntityId;
  preferredStylistName?: string;
  allergy?: string;
  taboo?: string;
  remark?: string;
}

/** 会员详情 */
export interface MemberDetailVO {
  id: EntityId;
  name: string;
  phone?: string;
  gender?: number;
  birthday?: string;
  levelId?: EntityId;
  levelName?: string;
  balance?: number;
  points?: number;
  source?: string;
  status?: number;
  remark?: string;
  storeId?: EntityId;
  balanceDetail?: MemberBalanceVO;
  tags?: MemberTagOption[];
  profile?: MemberProfileVO;
  createTime?: string;
}

/** 会员表单（不含 balance/points，余额积分走流水接口） */
export interface MemberFormPayload {
  id?: EntityId;
  name: string;
  phone?: string;
  gender?: number;
  birthday?: string;
  levelId?: EntityId;
  source?: string;
  status?: number;
  remark?: string;
  storeId: EntityId;
}

export interface MemberPageQuery {
  pageNum: number;
  pageSize: number;
  keywords?: string;
  status?: number;
  tenantId?: EntityId;
  storeId?: EntityId;
  levelId?: EntityId;
  tagId?: EntityId;
}

/** 余额流水 */
export interface MemberBalanceLogVO {
  id: EntityId;
  memberId?: EntityId;
  balanceType?: number;
  changeType?: number;
  beforeAmount?: number;
  changeAmount?: number;
  afterAmount?: number;
  bizNo?: string;
  operatorName?: string;
  remark?: string;
  createTime?: string;
}

export interface MemberBalanceLogPageQuery {
  pageNum: number;
  pageSize: number;
  memberId?: EntityId;
  storeId?: EntityId;
  balanceType?: number;
  changeType?: number;
  startTime?: string;
  endTime?: string;
}

export interface MemberBalanceAdjustPayload {
  balanceType: number;
  changeAmount: number;
  remark: string;
}

/** 积分流水 */
export interface MemberPointLogVO {
  id: EntityId;
  memberId?: EntityId;
  changeType?: number;
  beforePoints?: number;
  changePoints?: number;
  afterPoints?: number;
  expireTime?: string;
  bizNo?: string;
  operatorName?: string;
  remark?: string;
  createTime?: string;
}

export interface MemberPointLogPageQuery {
  pageNum: number;
  pageSize: number;
  memberId?: EntityId;
  storeId?: EntityId;
  changeType?: number;
  startTime?: string;
  endTime?: string;
}

export interface MemberPointAdjustPayload {
  changePoints: number;
  expireTime?: string;
  remark: string;
}

export interface MemberProfilePayload {
  hairQuality?: string;
  preferredStyle?: string;
  preferredStylistId?: EntityId;
  allergy?: string;
  taboo?: string;
  remark?: string;
}

/** 会员等级 */
export interface MemberLevelPageVO {
  id: EntityId;
  name: string;
  levelNo: number;
  serviceDiscount?: number;
  goodsDiscount?: number;
  pointRate?: number;
  rechargeGiftRate?: number;
  upgradeThreshold?: number;
  rights?: string;
  sort?: number;
  status?: number;
  createTime?: string;
}

export interface MemberLevelFormPayload {
  id?: EntityId;
  name: string;
  levelNo: number;
  serviceDiscount?: number;
  goodsDiscount?: number;
  pointRate?: number;
  rechargeGiftRate?: number;
  upgradeThreshold?: number;
  rights?: string;
  sort?: number;
  status?: number;
  remark?: string;
}

export interface MemberLevelPageQuery {
  pageNum: number;
  pageSize: number;
  keywords?: string;
  status?: number;
}

export interface MemberLevelOption {
  id: EntityId;
  name: string;
  levelNo: number;
  serviceDiscount?: number;
  goodsDiscount?: number;
  pointRate?: number;
}

/** 会员标签 */
export interface MemberTagVO {
  id: EntityId;
  name: string;
  color?: string;
  sort?: number;
  status?: number;
  remark?: string;
  createTime?: string;
}

export interface MemberTagFormPayload {
  id?: EntityId;
  name: string;
  color?: string;
  sort?: number;
  status?: number;
  remark?: string;
}

export interface MemberTagPageQuery {
  pageNum: number;
  pageSize: number;
  keywords?: string;
  status?: number;
}
