import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RotateCcw, TriangleAlert } from 'lucide-react';
import { Button } from '@/shared/ui/Button';

/**
 * React 渲染期错误边界，兜住未知组件错误并给出刷新恢复入口。
 */
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message?: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message,
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('App render error', error, info);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="flex min-h-screen items-center justify-center bg-salon-paper px-4 text-salon-ink dark:bg-zinc-950 dark:text-zinc-100">
        <section className="w-full max-w-md rounded-lg border border-salon-line bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300">
              <TriangleAlert className="size-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">页面出现异常</h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {this.state.message || '请刷新后重试'}
              </p>
            </div>
          </div>
          <Button
            className="mt-6 w-full"
            icon={<RotateCcw className="size-4" />}
            onClick={() => window.location.reload()}
          >
            刷新页面
          </Button>
        </section>
      </main>
    );
  }
}
