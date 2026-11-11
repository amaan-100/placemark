import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Eye, EyeOff, Trash2, UserRound } from "lucide-react";
import { EASE } from "./ui";

export function SessionTag({
  sessionId,
  email,
  authEnabled,
  onRequestDelete,
  onRequestSignIn,
  onRequestDeleteAccount,
}: {
  sessionId: string;
  email: string | null;
  authEnabled: boolean;
  onRequestDelete: () => void;
  onRequestSignIn: () => void;
  onRequestDeleteAccount: () => void;
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
      if (event.key === "Escape") {
        setOpen(false);
        setRevealed(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const shortId = sessionId.slice(0, 8).toUpperCase();
  const label = email ?? "No account needed";

  return (
    <div ref={wrapRef} className="relative ml-3 hidden sm:block">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="flex min-h-[44px] max-w-[220px] items-center gap-1.5 truncate font-mono text-[11px] uppercase tracking-[0.08em] text-inksoft hover:text-ink"
      >
        {email ? (
          <UserRound className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        ) : null}
        <span className="truncate">{label}</span>
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
            className="absolute left-0 top-full z-50 mt-1 w-72 rounded-[4px] border-2 border-ink bg-card p-3 shadow-[4px_4px_0_#16130E]"
          >
            <p className="font-mono text-[10px] uppercase tracking-wider text-inksoft">
              {email ? "Signed in" : "This session"}
            </p>

            {email ? (
              <p className="mt-1.5 truncate text-sm font-medium" title={email}>
                {email}
              </p>
            ) : null}

            <div className="mt-2 flex items-center gap-2">
              <span
                className={
                  revealed
                    ? "font-mono text-sm font-semibold tracking-wide"
                    : "select-none font-mono text-sm font-semibold tracking-wide blur-[4px]"
                }
                aria-hidden={!revealed}
              >
                {shortId}
              </span>
              <button
                type="button"
                onClick={() => setRevealed((value) => !value)}
                aria-label={revealed ? "Hide session ID" : "Show session ID"}
                aria-pressed={revealed}
                title={revealed ? "Hide session ID" : "Show session ID"}
                className="ml-auto flex h-8 w-8 items-center justify-center rounded-[3px] border border-line text-inksoft hover:border-ink hover:text-ink"
              >
                {revealed ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-inksoft">
              {revealed
                ? "Quote this if you contact support about this session."
                : "Hidden for privacy. Reveal only if you need to reference it."}
            </p>

            {!email && authEnabled ? (
              <div className="mt-3 rounded-[3px] border border-line bg-paper2/70 p-2.5">
                <p className="text-[11px] leading-relaxed text-inksoft">
                  This workspace lives in this browser. Sign in to keep it on
                  every device.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onRequestSignIn();
                  }}
                  className="mt-2 flex min-h-[44px] w-full items-center justify-center rounded-[3px] bg-ink px-3 text-[13px] font-semibold text-paper"
                >
                  Sign in to save progress
                </button>
              </div>
            ) : null}

            <div className="mt-3 space-y-1 border-t border-line pt-3">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onRequestDelete();
                }}
                className="flex min-h-[44px] w-full items-center gap-2 rounded-[3px] px-1 text-left text-[13px] font-medium text-err hover:bg-errbg"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                {email
                  ? "Delete this workspace data"
                  : "Delete this session and its data"}
              </button>

              {email ? (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onRequestDeleteAccount();
                  }}
                  className="flex min-h-[44px] w-full items-center gap-2 rounded-[3px] px-1 text-left text-[13px] font-medium text-err hover:bg-errbg"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Delete my account
                </button>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
