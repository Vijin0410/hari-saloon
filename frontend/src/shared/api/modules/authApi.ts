import { get, post } from '@/shared/api/client';
import { normalizeStringArray } from '@/shared/lib/format';
import type { CurrentUser, LoginFormValues, LoginResponse } from '@/features/auth/model/authTypes';

interface CurrentUserResponse {
  id: string;
  username: string;
  nickname: string;
  phone?: string;
  deptId?: string;
  roles?: unknown;
  perms?: unknown;
}

function normalizeCurrentUser(payload: CurrentUserResponse): CurrentUser {
  return {
    id: String(payload.id),
    username: payload.username,
    nickname: payload.nickname,
    phone: payload.phone,
    deptId: payload.deptId,
    roles: normalizeStringArray(payload.roles),
    perms: normalizeStringArray(payload.perms),
  };
}

export const authApi = {
  async login(payload: LoginFormValues): Promise<LoginResponse> {
    const response = await post<LoginResponse, LoginFormValues>('/auth/login', payload);
    return {
      ...response,
      userId: String(response.userId),
    };
  },

  async me(): Promise<CurrentUser> {
    const response = await get<CurrentUserResponse>('/auth/me');
    return normalizeCurrentUser(response);
  },
};
