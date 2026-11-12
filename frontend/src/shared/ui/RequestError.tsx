import { RefreshCw, ShieldAlert } from 'lucide-react';
import { Button } from './Button';

/** 请求失败与真实空数据分开呈现，保留可恢复操作，不把权限错误伪装成零数据。 */
export interface RequestErrorProps {
  message?: string;
  onRetry: () => void;
}

export function RequestError({ message, onRetry }: RequestErrorProps) {
  const denied = message?.includes('Access Denied') || message?.includes('权限');
  return (
    <div
      role="alert"
      className="flex flex-col items-center rounded-lg border border-salon-line bg-white px-6 py-12 text-center dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-salon-lilac text-salon-accent dark:bg-violet-950">
        <ShieldAlert className="size-5" />
      </div>
      <p className="font-medium">{denied ? '当前账号暂时无法查看这些数据' : '数据暂时未能加载'}</p>
      <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-500 dark:text-zinc-400">
        {denied
          ? '请联系管理员核对访问权限，或重新登录后再试。'
          : '请检查网络连接后重试，已有数据不会受到影响。'}
      </p>
      <Button
        className="mt-5"
        variant="secondary"
        icon={<RefreshCw className="size-3.5" />}
        onClick={onRetry}
      >
        重新加载
      </Button>
    </div>
  );
}
