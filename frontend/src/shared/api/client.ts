import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import { env } from '@/shared/config/env';
import { clearAccessToken, getAccessToken } from '@/shared/lib/authToken';
import type { ApiResponse } from '@/types';

type LoadingHandler = {
  start: () => void;
  stop: () => void;
};

let loadingHandler: LoadingHandler | null = null;
let unauthorizedHandler: (() => void) | null = null;

const SUCCESS_CODE = '00000';
const UNAUTHORIZED_CODES = new Set(['A0200', 'A0230', 'A0231']);

export class ApiError extends Error {
  status?: number;
  code?: string;

  constructor(message: string, options?: { status?: number; code?: string }) {
    super(message);
    this.name = 'ApiError';
    this.status = options?.status;
    this.code = options?.code;
  }
}

export function registerLoadingHandler(handler: LoadingHandler | null): void {
  loadingHandler = handler;
}

export function registerUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

function startLoading(): void {
  loadingHandler?.start();
}

function stopLoading(): void {
  loadingHandler?.stop();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isEnvelope(value: unknown): value is ApiResponse<unknown> {
  return isRecord(value) && typeof value.code === 'string' && typeof value.msg === 'string' && 'data' in value;
}

function handleUnauthorized(code?: string): void {
  if (code && UNAUTHORIZED_CODES.has(code)) {
    clearAccessToken();
    unauthorizedHandler?.();
  }
}

function extractMessage(error: AxiosError<unknown>): string {
  const data = error.response?.data;
  if (isEnvelope(data) && typeof data.msg === 'string') {
    return data.msg;
  }
  return error.message || '请求失败';
}

function unwrapResponse<T>(payload: unknown, status: number): T {
  if (isEnvelope(payload)) {
    if (payload.code === SUCCESS_CODE) {
      return payload.data as T;
    }
    handleUnauthorized(payload.code);
    throw new ApiError(payload.msg || '请求失败', { status, code: payload.code });
  }
  return payload as T;
}

const httpClient: AxiosInstance = axios.create({
  baseURL: env.VITE_API_BASE_URL,
  timeout: 15000,
});

httpClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    startLoading();
    const token = getAccessToken();
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
    return config;
  },
  (error: AxiosError) => {
    stopLoading();
    return Promise.reject(error);
  },
);

httpClient.interceptors.response.use(
  (response) => {
    stopLoading();
    return unwrapResponse(response.data, response.status);
  },
  (error: AxiosError<unknown>) => {
    stopLoading();
    if (error.response) {
      const message = extractMessage(error);
      const data = error.response.data;
      if (isEnvelope(data)) {
        handleUnauthorized(data.code);
        return Promise.reject(new ApiError(message, { status: error.response.status, code: data.code }));
      }
      return Promise.reject(new ApiError(message, { status: error.response.status }));
    }
    return Promise.reject(new ApiError(error.message || '网络异常'));
  },
);

export function get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return httpClient.get<unknown, T>(url, config);
}

export function post<T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<T> {
  return httpClient.post<unknown, T, D>(url, data, config);
}

export function put<T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<T> {
  return httpClient.put<unknown, T, D>(url, data, config);
}

export function patch<T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<T> {
  return httpClient.patch<unknown, T, D>(url, data, config);
}

export function deleteRequest<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return httpClient.delete<unknown, T>(url, config);
}

export function resetAuthState(): void {
  clearAccessToken();
}
