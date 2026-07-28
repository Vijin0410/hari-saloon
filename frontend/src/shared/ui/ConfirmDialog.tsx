import { AlertTriangle } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';

/**
 * 通用确认弹窗，避免删除、启停等危险动作直接使用浏览器确认框。
 */
export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  loading?: boolean;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({
  confirmLabel = '确认',
  danger,
  description,
  loading,
  onCancel,
  onConfirm,
  open,
  title,
}: ConfirmDialogProps) {
  return (
    <Modal
      maxWidthClassName="max-w-md"
      onClose={onCancel}
      open={open}
      title={title}
      footer={
        <>
          <Button onClick={onCancel} variant="secondary">
            取消
          </Button>
          <Button loading={loading} onClick={onConfirm} variant={danger ? 'danger' : 'primary'}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
          <AlertTriangle className="size-5" />
        </div>
        <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">{description}</p>
      </div>
    </Modal>
  );
}
