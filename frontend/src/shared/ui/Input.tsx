import type { ChangeEvent, InputHTMLAttributes, MouseEvent } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

/**
 * 通用输入框，业务表单通过 Field 组合标签和错误信息。
 */
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  /** 一键清除：有值时右侧显示 X，点击清空（触发 onChange，空值不显示） */
  clearable?: boolean;
}

const INPUT_BASE =
  'h-10 w-full rounded-md border border-salon-line bg-white px-3 text-sm text-salon-ink outline-none transition placeholder:text-zinc-400 focus:border-salon-accent focus:ring-2 focus:ring-violet-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-violet-400 dark:focus:ring-violet-900/40';
const INPUT_INVALID =
  'border-rose-300 focus:border-rose-500 focus:ring-rose-100 dark:border-rose-700';

export function Input({ className, invalid, clearable, onChange, ...props }: InputProps) {
  // type="date" 空值时原生占位为 yyyy/mm/dd 不美观，统一覆盖为灰色「选择时间」；disabled 态保持原生
  const isDateEmpty =
    props.type === 'date' &&
    !props.disabled &&
    (props.value === undefined || props.value === null || props.value === '');
  const hasValue = typeof props.value === 'string' ? props.value.length > 0 : Boolean(props.value);
  const clearableActive = Boolean(clearable) && !props.disabled && !props.readOnly;
  const showClear = clearableActive && hasValue;

  function handleClear(event: MouseEvent): void {
    event.stopPropagation();
    onChange?.({ target: { value: '' } } as ChangeEvent<HTMLInputElement>);
  }

  const clearIcon = showClear ? (
    <button
      aria-label="清除"
      className="absolute inset-y-0 right-3 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
      onClick={handleClear}
      type="button"
    >
      <X className="size-4" />
    </button>
  ) : null;

  if (isDateEmpty) {
    return (
      <div className="relative">
        <input
          className={cn(INPUT_BASE, invalid && INPUT_INVALID, 'text-transparent', className)}
          {...props}
          onChange={onChange}
        />
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-zinc-400">
          选择时间
        </span>
        {clearIcon}
      </div>
    );
  }
  // clearable 始终预留右侧内边距，避免有值/无值时光标因图标出现而跳动
  if (clearableActive) {
    return (
      <div className="relative">
        <input
          className={cn(INPUT_BASE, 'pr-9', invalid && INPUT_INVALID, className)}
          {...props}
          onChange={onChange}
        />
        {clearIcon}
      </div>
    );
  }
  return (
    <input
      className={cn(INPUT_BASE, invalid && INPUT_INVALID, className)}
      {...props}
      onChange={onChange}
    />
  );
}
