import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { cn } from '@/shared/lib/cn';

/**
 * 通用弹窗容器，承载 CRUD 表单、确认框和权限树编辑。
 */
export interface ModalProps {
  open: boolean;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  description?: string;
  maxWidthClassName?: string;
  onClose: () => void;
}

export function Modal({
  children,
  description,
  footer,
  maxWidthClassName = 'max-w-2xl',
  onClose,
  open,
  title,
}: ModalProps) {
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
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-zinc-950/45 px-4 py-6 backdrop-blur-sm">
      <div
        className={cn(
          'flex max-h-[calc(100vh-3rem)] w-full flex-col overflow-hidden rounded-lg border border-salon-line bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950',
          maxWidthClassName,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-salon-line px-5 py-4 dark:border-zinc-800">
          <div>
            <h2 className="text-base font-semibold text-salon-ink dark:text-zinc-100">{title}</h2>
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
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <div className="flex justify-end gap-2 border-t border-salon-line px-5 py-4 dark:border-zinc-800">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
