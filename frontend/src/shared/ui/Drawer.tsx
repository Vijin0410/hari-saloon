import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { cn } from '@/shared/lib/cn';

/**
 * 右侧滑出抽屉：详情、流水、复杂编辑等长内容场景。
 * 内容多时优于居中 Modal（Modal 适合短表单 / 确认）。
 * 新模块详情 / 流水强制用 Drawer（见 hair-salon-ui skill 第 9 节）。
 * 交互对齐 Modal：ESC 关闭、遮罩点击关闭、header/body/footer 三段式。
 */
export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  /** 面板宽度（CSS），默认 480px */
  width?: string;
  className?: string;
}

export function Drawer({
  open,
  onClose,
  title,
  description,
  footer,
  children,
  width = '480px',
  className,
}: DrawerProps) {
  useEffect(() => {
    if (!open) {
      return undefined;
    }
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div
        className="animate-[overlay-in_0.2s_ease-out] bg-zinc-950/45 backdrop-blur-sm motion-reduce:animate-none"
        onClick={onClose}
      />
      <div
        style={{ width }}
        className={cn(
          'flex h-full max-w-[100vw] flex-col overflow-hidden border-l border-salon-line bg-white shadow-xl animate-[drawer-in_0.2s_ease-out] motion-reduce:animate-none dark:border-zinc-800 dark:bg-zinc-950',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-salon-line px-5 py-4 dark:border-zinc-800">
          <div className="min-w-0">
            {title ? (
              <h2 className="text-base font-semibold text-salon-ink dark:text-zinc-100">{title}</h2>
            ) : null}
            {description ? (
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
            ) : null}
          </div>
          <Button
            aria-label="关闭"
            className="size-8 px-0"
            icon={<X className="size-4" />}
            onClick={onClose}
            size="sm"
            variant="ghost"
          />
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <div className="flex justify-end gap-2 border-t border-salon-line px-5 py-4 dark:border-zinc-800">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
