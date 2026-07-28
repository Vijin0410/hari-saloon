import { Link } from 'react-router-dom';
import { SearchX } from 'lucide-react';
import { Button } from '@/shared/ui/Button';

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-salon-paper px-4 text-salon-ink dark:bg-zinc-950 dark:text-zinc-100">
      <section className="w-full max-w-md rounded-lg border border-salon-line bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
          <SearchX className="size-7" />
        </div>
        <h1 className="mt-5 text-xl font-semibold">页面不存在</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">请检查地址是否正确。</p>
        <Link to="/">
          <Button className="mt-6" variant="secondary">
            返回首页
          </Button>
        </Link>
      </section>
    </main>
  );
}
