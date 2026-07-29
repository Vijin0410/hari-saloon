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
  const redirectTo = locationState?.from && locationState.from !== '/login' ? locationState.from : '/';

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
  const headline = isAdmin ? '平台管理登录' : '门店工作台登录';
  const subtitle = isAdmin
    ? '平台管理员登录至默认租户，管理所有租户与全局配置。'
    : '选择所属租户，使用分配的账号登录门店工作台。';

  return (
    <div className="w-full max-w-md rounded-2xl border border-salon-line bg-white p-8 shadow-xl shadow-emerald-900/5 transition dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-8">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-salon-line bg-salon-paper px-3 py-1 text-xs font-medium text-salon-accent dark:border-zinc-700 dark:bg-zinc-900">
          <ShieldCheck className="size-3.5" />
          {isAdmin ? 'Platform Console' : 'Store Workspace'}
        </div>
        <h1 className="text-2xl font-semibold">{headline}</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>
      </div>

      {submitError && !forceReset ? (
        <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
          {submitError}
        </div>
      ) : null}

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        {isAdmin ? null : (
          <Field error={errors.tenantCode?.message} label="所属租户" required>
            <div className="relative">
              <Building2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
              {tenantLoading ? (
                <Select className="pl-9" disabled>
                  <option>加载租户中…</option>
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
                <Input
                  className="pl-9"
                  placeholder="default"
                  {...register('tenantCode')}
                />
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

        <Button className="w-full" icon={<LogIn className="size-4" />} loading={isSubmitting} type="submit">
          {isAdmin ? '进入平台管理' : '登录门店工作台'}
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-zinc-400 dark:text-zinc-500">
        无公开注册；由平台开通租户、租户内建用户。
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
