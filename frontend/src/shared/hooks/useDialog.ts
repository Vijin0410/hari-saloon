import { useEffect, useRef, type RefObject } from 'react';

/** 模态层统一处理焦点、滚动和栈顶键盘事件；叠加时仅关闭最上层。 */
const stack: symbol[] = [];
let originalOverflow = '';
let layerSequence = 0;

export function useDialog(
  open: boolean,
  onClose: () => void,
  panel: RefObject<HTMLDivElement | null>,
) {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    if (!open) return undefined;
    const key = Symbol('dialog');
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (stack.length === 0) {
      originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    stack.push(key);
    layerSequence += 1;
    const overlay = panel.current?.parentElement;
    overlay?.style.setProperty('z-index', String(50 + layerSequence * 10));
    const frame = requestAnimationFrame(() => {
      panel.current?.focus();
    });
    function onKeyDown(event: KeyboardEvent) {
      if (stack.at(-1) !== key) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
      }
      if (event.key !== 'Tab') return;
      const elements = Array.from(
        panel.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
        ) ?? [],
      ).filter((element) => element.getClientRects().length > 0);
      const first = elements[0];
      const last = elements.at(-1);
      if (!first) {
        event.preventDefault();
        panel.current?.focus();
        return;
      }
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === panel.current)
      ) {
        event.preventDefault();
        last?.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || document.activeElement === panel.current)
      ) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown);
      const index = stack.indexOf(key);
      if (index >= 0) stack.splice(index, 1);
      if (stack.length === 0) {
        document.body.style.overflow = originalOverflow;
        layerSequence = 0;
      }
      if (previous?.isConnected) previous.focus();
    };
  }, [open, panel]);
}
