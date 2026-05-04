import { type RefObject, useEffect } from 'react';

/** Focus trap + Escape (capture) while modal open; restores focus on close. */
export function useModalA11y(
  open: boolean,
  containerRef: RefObject<HTMLElement | null>,
  onClose: () => void
) {
  useEffect(() => {
    if (!open) return;
    const root = containerRef.current;
    if (!root) return;

    const prev = document.activeElement as HTMLElement | null;

    const selector =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const focusables = () => Array.from(root.querySelectorAll<HTMLElement>(selector));

    const first = () => {
      const nodes = focusables();
      (nodes[0] ?? root).focus();
    };
    first();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const nodes = focusables();
      if (nodes.length === 0) return;
      const fi = nodes[0];
      const la = nodes[nodes.length - 1];
      const cur = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (cur === fi || !root.contains(cur)) {
          e.preventDefault();
          la.focus();
        }
      } else {
        if (cur === la) {
          e.preventDefault();
          fi.focus();
        }
      }
    };

    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      prev?.focus?.();
    };
  }, [open, onClose, containerRef]);
}
