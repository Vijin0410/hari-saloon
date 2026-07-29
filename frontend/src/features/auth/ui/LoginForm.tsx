import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, LogIn, LockKeyhole, Scissors, User } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { authApi } from '@/shared/api/modules/authApi';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { useAuthStore } from '@/store/useAuthStore';
import {
  changePasswordSchema,
  loginSchema,
  type ChangePasswordSchemaValues,
  type LoginSchemaValues,
} from '@/features/auth/model/loginSchema';
import type { CurrentUser } from '@/features/auth/model/authTypes';

/**
 * 登录业务表单：租户编码 + 账号密码；须改密时弹窗强制修改。
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

export function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((state) => state.setSession);
  const setUser = useAuthStore((state) => state.setUser);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [forceReset, setForceReset] = useState(false);
  const [tokenCache, setTokenCache] = useState<string | null>(null);
  const locationState = location.state as LoginLocationState | null;
  const redirectTo = locationState?.from && locationState.from !== '/login' ? locationState.from : '/';

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<LoginSchemaValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      tenantCode: 'default',
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

  return (
    <div className="w-full max-w-md rounded-lg border border-salon-line bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-8 flex items-center gap-3 lg:hidden">
        <div className="flex size-11 items-center justify-center rounded-lg bg-salon-accent text-white">
          <Scissors className="size-5" />
        </div>
        <div>
          <p className="text-sm font-semibold">Hari Salon</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">门店系统管理端</p>
        </div>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold">登录</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          无公开注册；由平台开通租户、租户内建用户。默认租户编码 default。
        </p>
      </div>

      {submitError && !forceReset ? (
        <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
          {submitError}
        </div>
      ) : null}

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <Field error={errors.tenantCode?.message} label="租户编码">
          <div className="relative">
            <Building2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <Input
              autoComplete="organization"
              className="pl-9"
              invalid={Boolean(errors.tenantCode)}
              placeholder="default"
              {...register('tenantCode')}
            />
          </div>
        </Field>

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
              className="pl-9"
              invalid={Boolean(errors.password)}
              placeholder="请输入密码"
              type="password"
              {...register('password')}
            />
          </div>
        </Field>

        <Button className="w-full" icon={<LogIn className="size-4" />} loading={isSubmitting} type="submit">
          登录系统
        </Button>
      </form>

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
