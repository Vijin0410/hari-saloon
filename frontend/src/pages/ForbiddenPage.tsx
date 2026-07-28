import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/shared/ui/Button';

export function ForbiddenPage() {
  return (
    <section className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-md rounded-lg border border-salon-line bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
          <ShieldAlert className="size-7" />
        </div>
        <h1 className="mt-5 text-xl font-semibold">没有访问权限</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">当前账号缺少此页面所需的权限点。</p>
        <Link to="/">
          <Button className="mt-6" variant="secondary">
            返回工作台
          </Button>
        </Link>
      </div>
    </section>
  );
}
