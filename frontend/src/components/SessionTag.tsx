import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Eye, EyeOff, Trash2 } from 'lucide-react';
import { EASE } from './ui';

export function SessionTag({
  sessionId,
  onRequestDelete,
}: {
  sessionId: string;
  onRequestDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const onPointerDown = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false);
        setRevealed(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        setRevealed(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const shortId = sessionId.slice(0, 8).toUpperCase();

  return (
    <div ref={wrapRef} className="relative ml-3 hidden sm:block">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="flex min-h-[44px] items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-inksoft hover:text-ink"
      >
        No account needed
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            role="dialog"
            aria-label="Session details"
            initial={reduce ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="absolute left-0 top-full z-50 mt-1 w-64 rounded-[4px] border-2 border-ink bg-card p-3 shadow-[4px_4px_0_#16130E]"
          >
            <p className="font-mono text-[10px] uppercase tracking-wider text-inksoft">
              This session
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={
                  revealed
                    ? 'font-mono text-sm font-semibold tracking-wide'
                    : 'select-none font-mono text-sm font-semibold tracking-wide blur-[4px]'
                }
                aria-hidden={!revealed}
              >
                {shortId}
              </span>
              <button
                type="button"
                onClick={() => setRevealed((value) => !value)}
                aria-label={revealed ? 'Hide session ID' : 'Show session ID'}
                aria-pressed={revealed}
                title={revealed ? 'Hide session ID' : 'Show session ID'}
                className="ml-auto flex h-8 w-8 items-center justify-center rounded-[3px] border border-line text-inksoft hover:border-ink hover:text-ink"
              >
                {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {!revealed ? (
              <p className="mt-1.5 text-[11px] leading-relaxed text-inksoft">
                Hidden for privacy. Reveal only if you need to reference it.
              </p>
            ) : (
              <p className="mt-1.5 text-[11px] leading-relaxed text-inksoft">
                Quote this if you contact support about this session.
              </p>
            )}

            <div className="mt-3 border-t border-line pt-3">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onRequestDelete();
                }}
                className="flex min-h-[44px] w-full items-center gap-2 rounded-[3px] px-1 text-left text-[13px] font-medium text-err hover:bg-errbg"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Delete this session and its data
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
