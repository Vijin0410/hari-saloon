import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Eye, EyeOff, LogIn, LockKeyhole, ShieldCheck, User } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { authApi } from '@/shared/api/modules/authApi';
import { tenantApi } from '@/shared/api/modules/systemApi';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { Select } from '@/shared/ui/Select';
import { useAuthStore } from '@/store/useAuthStore';
import {
  changePasswordSchema,
  loginSchema,
  type ChangePasswordSchemaValues,
  type LoginSchemaValues,
} from '@/features/auth/model/loginSchema';
import type { CurrentUser, LoginVariant } from '@/features/auth/model/authTypes';
import type { TenantLoginOption } from '@/features/system/model/dictTypes';

/**
 * 登录业务表单：
 * - store（门店工作台）：选择租户 + 账号密码；
 * - admin（平台管理）：仅账号密码，登录到默认租户。
 * 首次登录须改密时弹窗强制修改。
 */
type LoginLocationState = {
  from?: string;
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '登录失败，请稍后重试';
}

function createInitialUser(loginUser: {
  userId: string;
  username: string;
  nickname: string;
  pwdResetRequired?: boolean;
}): CurrentUser {
  return {
    id: loginUser.userId,
    username: loginUser.username,
    nickname: loginUser.nickname,
    pwdResetRequired: Boolean(loginUser.pwdResetRequired),
    roles: [],
    perms: [],
  };
}

interface LoginFormProps {
  variant: LoginVariant;
}

export function LoginForm({ variant }: LoginFormProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((state) => state.setSession);
  const setUser = useAuthStore((state) => state.setUser);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [forceReset, setForceReset] = useState(false);
  const [tokenCache, setTokenCache] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [tenantOptions, setTenantOptions] = useState<TenantLoginOption[]>([]);
  const [tenantLoading, setTenantLoading] = useState(false);
  const locationState = location.state as LoginLocationState | null;
  const redirectTo =
    locationState?.from && locationState.from !== '/login' ? locationState.from : '/';

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setValue,
  } = useForm<LoginSchemaValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      tenantCode: '',
      username: '',
      password: '',
    },
  });

  const {
    formState: { errors: pwdErrors, isSubmitting: pwdSubmitting },
    handleSubmit: handlePwdSubmit,
    register: registerPwd,
    reset: resetPwd,
  } = useForm<ChangePasswordSchemaValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { oldPassword: '', newPassword: '' },
  });

  // 门店入口：拉取公开租户下拉，默认选中第一个（通常为默认租户）
  useEffect(() => {
    if (variant !== 'store') {
      return;
    }
    let active = true;
    setTenantLoading(true);
    tenantApi
      .optionsPublic()
      .then((options) => {
        if (!active) {
          return;
        }
        setTenantOptions(options ?? []);
        const fallback = options?.[0]?.value ?? 'default';
        setValue('tenantCode', fallback, { shouldValidate: true });
      })
      .catch(() => {
        // 拉取失败时回退到手输默认租户编码
        if (active) {
          setTenantOptions([]);
          setValue('tenantCode', 'default');
        }
      })
      .finally(() => {
        if (active) {
          setTenantLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [setValue, variant]);

  async function onSubmit(values: LoginSchemaValues): Promise<void> {
    setSubmitError(null);
    try {
      const loginResponse = await authApi.login(values);
      setSession(loginResponse.token, createInitialUser(loginResponse));
      const currentUser = await authApi.me();
      setSession(loginResponse.token, currentUser);
      if (loginResponse.pwdResetRequired || currentUser.pwdResetRequired) {
        setTokenCache(loginResponse.token);
        setForceReset(true);
        resetPwd({ oldPassword: values.password, newPassword: '' });
        return;
      }
      navigate(redirectTo, { replace: true });
    } catch (error) {
      clearSession();
      setSubmitError(getErrorMessage(error));
    }
  }

  async function onChangePassword(values: ChangePasswordSchemaValues): Promise<void> {
    setSubmitError(null);
    try {
      await authApi.changePassword(values);
      const currentUser = await authApi.me();
      if (tokenCache) {
        setSession(tokenCache, { ...currentUser, pwdResetRequired: false });
      } else {
        setUser({ ...currentUser, pwdResetRequired: false });
      }
      setForceReset(false);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    }
  }

  const isAdmin = variant === 'admin';
  const headline = isAdmin ? '平台管理登录' : '欢迎回到你的沙龙';
  const subtitle = isAdmin
    ? '登录平台，管理品牌与门店的每一步成长。'
    : '美好的一天，从有序的经营开始。';

  return (
    <div className="w-full max-w-[380px]">
      <div className="mb-9">
        <div className="mb-5 flex items-center gap-2 text-[11px] font-medium tracking-[.2em] text-salon-accent dark:text-violet-300">
          <span className="h-px w-6 bg-salon-accent/60" />
          {isAdmin ? 'PLATFORM CONSOLE' : 'YOUR SALON, CONNECTED'}
        </div>
        <h1 className="text-[30px] font-semibold tracking-tight sm:text-[32px]">{headline}</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{subtitle}</p>
      </div>

      {submitError && !forceReset ? (
        <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
          {submitError}
        </div>
      ) : null}

      <form
        className="space-y-5 [&_input]:h-12 [&_input]:bg-white/80 [&_select]:h-12 [&_select]:bg-white/80 dark:[&_input]:bg-zinc-900 dark:[&_select]:bg-zinc-900"
        onSubmit={handleSubmit(onSubmit)}
      >
        {isAdmin ? null : (
          <Field error={errors.tenantCode?.message} label="所属品牌 / 门店" required>
            <div className="relative">
              <Building2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
              {tenantLoading ? (
                <Select className="pl-9" disabled>
                  <option>正在查找门店…</option>
                </Select>
              ) : tenantOptions.length > 0 ? (
                <Select className="pl-9" {...register('tenantCode')}>
                  {tenantOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input className="pl-9" placeholder="default" {...register('tenantCode')} />
              )}
            </div>
          </Field>
        )}

        <Field error={errors.username?.message} label="用户名" required>
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <Input
              autoComplete="username"
              className="pl-9"
              invalid={Boolean(errors.username)}
              placeholder="请输入用户名"
              {...register('username')}
            />
          </div>
        </Field>

        <Field error={errors.password?.message} label="密码" required>
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <Input
              autoComplete="current-password"
              className="px-9"
              invalid={Boolean(errors.password)}
              placeholder="请输入密码"
              type={showPassword ? 'text' : 'password'}
              {...register('password')}
            />
            <button
              aria-label={showPassword ? '隐藏密码' : '显示密码'}
              className="absolute right-2 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
              onClick={() => setShowPassword((current) => !current)}
              type="button"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>

        <Button
          className="mt-2 h-12 w-full shadow-lg shadow-salon-accent/15"
          icon={<LogIn className="size-4" />}
          loading={isSubmitting}
          type="submit"
        >
          {isAdmin ? '进入平台管理' : '进入我的工作台'}
        </Button>
      </form>

      <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
        <ShieldCheck className="size-3.5 text-zinc-400" />
        账号由{isAdmin ? '平台' : '门店'}管理员开通
      </p>

      <Modal
        description="后台新建或重置的账号须先修改密码后才能继续使用。"
        footer={
          <>
            <Button
              onClick={() => {
                clearSession();
                setForceReset(false);
              }}
              variant="secondary"
            >
              退出登录
            </Button>
            <Button loading={pwdSubmitting} onClick={handlePwdSubmit(onChangePassword)}>
              确认修改
            </Button>
          </>
        }
        onClose={() => undefined}
        open={forceReset}
        title="首次登录请修改密码"
      >
        {submitError ? (
          <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {submitError}
          </div>
        ) : null}
        <form className="space-y-4" onSubmit={handlePwdSubmit(onChangePassword)}>
          <Field error={pwdErrors.oldPassword?.message} label="原密码" required>
            <Input type="password" {...registerPwd('oldPassword')} />
          </Field>
          <Field error={pwdErrors.newPassword?.message} label="新密码" required>
            <Input type="password" placeholder="至少 6 位" {...registerPwd('newPassword')} />
          </Field>
          <button className="hidden" type="submit" />
        </form>
      </Modal>
    </div>
  );
}
