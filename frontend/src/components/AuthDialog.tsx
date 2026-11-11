import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Loader2, X } from "lucide-react";
import { authClient, getAccessToken } from "../lib/auth";
import { Btn, EASE, Mono } from "./ui";

type Mode = "signIn" | "signUp";

export function AuthDialog({
  open,
  onClose,
  onSignedIn,
}: {
  open: boolean;
  onClose: () => void;
  onSignedIn: () => void;
}) {
  const [mode, setMode] = useState<Mode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) {
      return;
    }
    setError(null);
    setPassword("");
    const previous = document.activeElement as HTMLElement | null;
    const timer = window.setTimeout(() => panelRef.current?.focus(), 60);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        onClose();
      }
      if (event.key === "Tab" && panelRef.current) {
        const elements = panelRef.current.querySelectorAll<HTMLElement>(
          'button, input, [href], textarea, [tabindex]:not([tabindex="-1"])',
        );
        const list = Array.from(elements).filter(
          (element) => !element.hasAttribute("disabled"),
        );
        if (!list.length) {
          return;
        }
        const first = list[0];
        const last = list[list.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previous?.focus?.();
    };
  }, [open, busy, onClose]);

  if (!authClient) {
    return null;
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!authClient) {
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const result =
        mode === "signUp"
          ? await authClient.signUp.email({
              email: cleanEmail,
              password,
              name: cleanEmail,
            })
          : await authClient.signIn.email({ email: cleanEmail, password });

      if (result?.error) {
        setError(
          result.error.message ?? "That did not work. Check your details.",
        );
        return;
      }

      // The auth client can trail the sign-in call by a moment. Do not hand off
      // until a token is actually readable, or the next request goes out
      // anonymous and the UI shows "no account".
      for (let attempt = 0; attempt < 10; attempt += 1) {
        if (await getAccessToken()) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 150));
      }

      onSignedIn();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "That did not work. Try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-6"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduce ? undefined : { opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-title"
        >
          <div
            className="absolute inset-0 bg-ink/60 backdrop-blur-[2px]"
            onClick={() => (!busy ? onClose() : undefined)}
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            initial={reduce ? false : { opacity: 0, y: 32, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="relative mb-[env(safe-area-inset-bottom)] max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[6px] border-2 border-ink bg-card p-5 shadow-[0_24px_60px_rgba(22,19,14,0.35)] outline-none sm:mb-0 sm:rounded-[6px] sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <Mono className="text-accentdark">Account</Mono>
                <h2
                  id="auth-title"
                  className="mt-1 font-display text-2xl font-semibold"
                >
                  {mode === "signIn" ? "Sign in" : "Create an account"}
                </h2>
                <p className="mt-1 text-sm text-inksoft">
                  Keep this workspace on every device. Your resume, drafts, and
                  practice history follow you.
                </p>
              </div>
              <button
                onClick={onClose}
                disabled={busy}
                aria-label="Close sign-in dialog"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line hover:border-ink hover:bg-paper2 disabled:opacity-40"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="auth-email" className="text-sm font-medium">
                  Email
                </label>
                <input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={busy}
                  className="mt-2 min-h-[44px] w-full rounded-[3px] border border-linedark bg-paper px-3 text-sm focus:border-accent"
                />
              </div>
              <div>
                <label htmlFor="auth-password" className="text-sm font-medium">
                  Password
                </label>
                <input
                  id="auth-password"
                  type="password"
                  autoComplete={
                    mode === "signUp" ? "new-password" : "current-password"
                  }
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={busy}
                  className="mt-2 min-h-[44px] w-full rounded-[3px] border border-linedark bg-paper px-3 text-sm focus:border-accent"
                />
                {mode === "signUp" ? (
                  <p className="mt-1.5 text-xs text-inksoft">
                    At least 8 characters.
                  </p>
                ) : null}
              </div>

              {error ? (
                <p
                  className="rounded-[4px] border border-err/40 bg-errbg px-3 py-2 text-sm text-err"
                  role="alert"
                >
                  {error}
                </p>
              ) : null}

              <Btn type="submit" disabled={busy} className="w-full">
                {busy ? (
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : null}
                {mode === "signIn" ? "Sign in" : "Create account"}
              </Btn>
            </form>

            <p className="mt-4 text-center text-sm text-inksoft">
              {mode === "signIn"
                ? "No account yet?"
                : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "signIn" ? "signUp" : "signIn");
                  setError(null);
                }}
                className="font-medium text-accentdark underline underline-offset-2"
              >
                {mode === "signIn" ? "Create one" : "Sign in"}
              </button>
            </p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
