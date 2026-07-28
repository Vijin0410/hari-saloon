export interface LoginFormValues {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  userId: string;
  username: string;
  nickname: string;
}

export interface CurrentUser {
  id: string;
  username: string;
  nickname: string;
  phone?: string;
  deptId?: string;
  roles: string[];
  perms: string[];
}
