import { useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useDialog } from '@/shared/hooks/useDialog';
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
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useDialog(open, onClose, panel);

  if (!open) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-salon-plum/35 px-4 py-6 backdrop-blur-sm">
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={cn(
          'flex max-h-[calc(100dvh-3rem)] w-full flex-col overflow-hidden rounded-2xl border border-salon-line bg-white shadow-xl outline-none dark:border-zinc-800 dark:bg-zinc-950',
          maxWidthClassName,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-salon-line px-5 py-4 dark:border-zinc-800">
          <div>
            <h2 id={titleId} className="text-base font-semibold text-salon-ink dark:text-zinc-100">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {description}
              </p>
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
    </div>,
    document.body,
  );
}
