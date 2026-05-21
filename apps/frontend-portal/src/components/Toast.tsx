import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

type Toast = {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number;
};

type ToastContextValue = {
  toast: (message: string, opts?: { variant?: ToastVariant; duration?: number }) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_STYLES: Record<
  ToastVariant,
  { ring: string; icon: ReactNode; tint: string }
> = {
  success: {
    ring: 'border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.15)]',
    icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
    tint: 'from-emerald-500/10 to-transparent',
  },
  error: {
    ring: 'border-rose-500/30 shadow-[0_0_30px_rgba(244,63,94,0.15)]',
    icon: <AlertCircle className="w-5 h-5 text-rose-400" />,
    tint: 'from-rose-500/10 to-transparent',
  },
  warning: {
    ring: 'border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.15)]',
    icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
    tint: 'from-amber-500/10 to-transparent',
  },
  info: {
    ring: 'border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.15)]',
    icon: <Info className="w-5 h-5 text-indigo-400" />,
    tint: 'from-indigo-500/10 to-transparent',
  },
};

const MAX_VISIBLE = 5;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((curr) => curr.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (
      message: string,
      opts?: { variant?: ToastVariant; duration?: number }
    ) => {
      const id =
        (typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2, 11));
      const variant = opts?.variant ?? 'info';
      const duration = opts?.duration ?? (variant === 'error' ? 6000 : 4000);
      setToasts((curr) => [
        ...curr.slice(-(MAX_VISIBLE - 1)),
        { id, message, variant, duration },
      ]);
    },
    []
  );

  const value: ToastContextValue = {
    toast: push,
    success: (message, duration) => push(message, { variant: 'success', duration }),
    error: (message, duration) => push(message, { variant: 'error', duration }),
    info: (message, duration) => push(message, { variant: 'info', duration }),
    warning: (message, duration) => push(message, { variant: 'warning', duration }),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed top-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: () => void;
}) {
  const styles = VARIANT_STYLES[toast.variant];

  useEffect(() => {
    const t = setTimeout(onDismiss, toast.duration);
    return () => clearTimeout(t);
  }, [toast.duration, onDismiss]);

  return (
    <div
      role={toast.variant === 'error' ? 'alert' : 'status'}
      className={`pointer-events-auto relative min-w-[320px] max-w-[420px] overflow-hidden rounded-2xl border ${styles.ring} bg-[#12121a]/95 backdrop-blur-xl animate-in fade-in slide-in-from-right-4 duration-300`}
    >
      <div
        className={`absolute inset-0 bg-gradient-to-br ${styles.tint} pointer-events-none`}
      />
      <div className="relative flex items-start gap-3 px-4 py-3.5">
        <div className="shrink-0 mt-0.5">{styles.icon}</div>
        <p className="flex-1 text-sm text-slate-100 leading-snug break-words">
          {toast.message}
        </p>
        <button
          onClick={onDismiss}
          className="shrink-0 p-1 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/10 transition-colors"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
