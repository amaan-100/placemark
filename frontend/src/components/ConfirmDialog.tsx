import { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Btn, EASE, Mono } from './ui';

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const previous = document.activeElement as HTMLElement | null;
    const focusTimer = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>('button')?.focus();
    }, 60);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) {
        return;
      }
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previous?.focus?.();
    };
  }, [open, onCancel]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-6"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduce ? undefined : { opacity: 0 }}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          aria-describedby="confirm-description"
        >
          <div
            className="absolute inset-0 bg-ink/60 backdrop-blur-[2px]"
            onClick={onCancel}
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            initial={reduce ? false : { opacity: 0, y: 24, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: 16, scale: 0.99 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="relative w-full max-w-md rounded-t-[6px] border-2 border-ink bg-card p-6 shadow-[0_24px_60px_rgba(22,19,14,0.35)] outline-none sm:rounded-[6px]"
          >
            <Mono className="text-accentdark">Confirm</Mono>
            <h2 id="confirm-title" className="mt-2 font-display text-2xl font-semibold">
              {title}
            </h2>
            <p id="confirm-description" className="mt-2 text-sm leading-relaxed text-inksoft">
              {description}
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Btn variant="ghost" onClick={onCancel} disabled={busy}>
                {cancelLabel}
              </Btn>
              <Btn variant="danger" onClick={onConfirm} disabled={busy}>
                {busy ? 'Working…' : confirmLabel}
              </Btn>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
