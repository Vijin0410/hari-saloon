export interface LoginFormValues {
  tenantCode?: string;
  username: string;
  password: string;
}

/** 登录入口：admin=平台管理（默认租户），store=门店工作台（选择租户） */
export type LoginVariant = 'admin' | 'store';

export interface LoginResponse {
  token: string;
  userId: string;
  username: string;
  nickname: string;
  pwdResetRequired?: boolean;
}

export interface CurrentUser {
  id: string;
  username: string;
  nickname: string;
  phone?: string;
  /** 头像预签名 URL（无头像时为 undefined） */
  avatar?: string;
  deptId?: string;
  tenantId?: string;
  pwdResetRequired?: boolean;
  roles: string[];
  perms: string[];
}

export interface ChangePasswordPayload {
  oldPassword: string;
  newPassword: string;
}
