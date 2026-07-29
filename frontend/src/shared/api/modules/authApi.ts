import { get, post } from '@/shared/api/client';
import { normalizeStringArray } from '@/shared/lib/format';
import type {
  ChangePasswordPayload,
  CurrentUser,
  LoginFormValues,
  LoginResponse,
} from '@/features/auth/model/authTypes';

interface CurrentUserResponse {
  id: string;
  username: string;
  nickname: string;
  phone?: string;
  deptId?: string;
  tenantId?: string;
  pwdResetRequired?: boolean;
  roles?: unknown;
  perms?: unknown;
}

function normalizeCurrentUser(payload: CurrentUserResponse): CurrentUser {
  return {
    id: String(payload.id),
    username: payload.username,
    nickname: payload.nickname,
    phone: payload.phone,
    deptId: payload.deptId != null ? String(payload.deptId) : undefined,
    tenantId: payload.tenantId != null ? String(payload.tenantId) : undefined,
    pwdResetRequired: Boolean(payload.pwdResetRequired),
    roles: normalizeStringArray(payload.roles),
    perms: normalizeStringArray(payload.perms),
  };
}

export const authApi = {
  async login(payload: LoginFormValues): Promise<LoginResponse> {
    const body = {
      username: payload.username,
      password: payload.password,
      tenantCode: payload.tenantCode?.trim() || undefined,
    };
    const response = await post<LoginResponse, typeof body>('/auth/login', body);
    return {
      ...response,
      userId: String(response.userId),
      pwdResetRequired: Boolean(response.pwdResetRequired),
    };
  },

  async me(): Promise<CurrentUser> {
    const response = await get<CurrentUserResponse>('/auth/me');
    return normalizeCurrentUser(response);
  },

  changePassword(payload: ChangePasswordPayload): Promise<void> {
    return post<void, ChangePasswordPayload>('/auth/change-password', payload);
  },
};
