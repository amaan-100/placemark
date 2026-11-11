import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { cn } from '../utils/cn';

export const EASE = [0.22, 1, 0.36, 1] as const;

export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

export function Mono({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('font-mono text-[11px] tracking-[0.08em] uppercase', className)}>
      {children}
    </span>
  );
}

export function Btn({
  children,
  onClick,
  variant = 'primary',
  disabled,
  className,
  type = 'button',
  ariaLabel,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'ghost' | 'ink' | 'danger';
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
  ariaLabel?: string;
}) {
  const styles = {
    primary:
      'bg-accentdark text-white hover:bg-[#A63308] active:bg-[#A63308] shadow-[0_2px_0_#16130E]',
    ink: 'bg-ink text-paper hover:bg-black active:bg-black',
    ghost: 'bg-transparent text-ink border border-linedark hover:border-ink hover:bg-paper2',
    danger: 'bg-err text-white hover:bg-[#8f1d17]',
  }[variant];
  return (
    <button
      type={type}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[3px] px-5 py-3 text-sm font-semibold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none active:translate-y-[1px]',
        styles,
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Chip({
  children,
  tone = 'default',
}: {
  children: ReactNode;
  tone?: 'default' | 'accent' | 'moss' | 'amber' | 'err';
}) {
  const tones = {
    default: 'border-line bg-card text-ink',
    accent: 'border-accent/40 bg-accent/10 text-accentdark',
    moss: 'border-moss/40 bg-mossbg text-moss',
    amber: 'border-amber/40 bg-amberbg text-amber',
    err: 'border-err/40 bg-errbg text-err',
  }[tone];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
        tones,
      )}
    >
      {children}
    </span>
  );
}

export function ScoreBar({ score, className }: { score: number; className?: string }) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const reduce = useReducedMotion();
  return (
    <div
      className={cn('flex items-center gap-2', className)}
      role="img"
      aria-label={`Match score ${clamped} out of 100`}
    >
      <div className="h-[5px] w-24 overflow-hidden rounded-full bg-line/70">
        <motion.div
          className="h-full w-full origin-left rounded-full bg-accent"
          initial={reduce ? false : { scaleX: 0 }}
          animate={{ scaleX: clamped / 100 }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.15 }}
        />
      </div>
      <span className="font-mono text-xs font-semibold">{clamped}</span>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('shimmer rounded-[3px] bg-line/50', className)} aria-hidden="true" />;
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-[4px] border border-dashed border-linedark bg-card/60 px-6 py-10">
      <p className="font-display text-xl font-semibold">{title}</p>
      <p className="max-w-md text-sm leading-relaxed text-inksoft">{body}</p>
      {action}
    </div>
  );
}
