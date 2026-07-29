export interface LoginFormValues {
  tenantCode?: string;
  username: string;
  password: string;
}

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
