import { Check, CircleAlert, Info, X } from 'lucide-react';
import { cn } from '../utils/cn';

export type ToastKind = 'success' | 'error' | 'info';
export type ToastMessage = { kind: ToastKind; text: string };

export function Toast({
  message,
  onDismiss,
}: {
  message: ToastMessage;
  onDismiss: () => void;
}) {
  const tone = {
    success: { icon: Check, ring: 'border-moss/50', bg: 'bg-mossbg', text: 'text-moss' },
    error: { icon: CircleAlert, ring: 'border-err/50', bg: 'bg-errbg', text: 'text-err' },
    info: { icon: Info, ring: 'border-line', bg: 'bg-card', text: 'text-inksoft' },
  }[message.kind];
  const Icon = tone.icon;
  return (
    <div
      className={cn(
        'fixed bottom-5 right-5 z-[70] flex max-w-sm items-start gap-3 rounded-[6px] border-2 px-4 py-3 shadow-[0_12px_30px_rgba(22,19,14,0.18)]',
        tone.ring,
        tone.bg,
      )}
      role={message.kind === 'error' ? 'alert' : 'status'}
    >
      <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', tone.text)} aria-hidden="true" />
      <p className="flex-1 text-sm leading-relaxed text-ink">{message.text}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-inksoft hover:bg-paper2 hover:text-ink"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
