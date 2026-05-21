import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AlertTriangle, X } from 'lucide-react';

type ConfirmVariant = 'danger' | 'primary';

export type ConfirmOptions = {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
};

type ConfirmState = ConfirmOptions & {
  resolver: (value: boolean) => void;
};

const ConfirmContext =
  createContext<((opts: ConfirmOptions) => Promise<boolean>) | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmState | null>(null);

  const confirm = useCallback(
    (opts: ConfirmOptions): Promise<boolean> =>
      new Promise((resolve) => {
        setState({ ...opts, resolver: resolve });
      }),
    []
  );

  const close = useCallback(
    (result: boolean) => {
      if (state) {
        state.resolver(result);
        setState(null);
      }
    },
    [state]
  );

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && <ConfirmDialog state={state} onClose={close} />}
    </ConfirmContext.Provider>
  );
}

function ConfirmDialog({
  state,
  onClose,
}: {
  state: ConfirmState;
  onClose: (r: boolean) => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const variant = state.variant ?? 'danger';

  useEffect(() => {
    cancelRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose(false);
      else if (e.key === 'Enter') onClose(true);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const confirmStyles =
    variant === 'danger'
      ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-rose-500/20 hover:shadow-rose-500/40'
      : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-indigo-500/20 hover:shadow-indigo-500/40';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-desc"
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => onClose(false)}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-md bg-[#12121a]/95 border border-white/10 rounded-3xl shadow-2xl shadow-black animate-in zoom-in-95 slide-in-from-bottom-2 duration-200">
        <button
          onClick={() => onClose(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/10 transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="p-7">
          <div className="flex items-start gap-4">
            {variant === 'danger' && (
              <div className="shrink-0 w-11 h-11 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h2
                id="confirm-title"
                className="text-lg font-bold text-white tracking-tight"
              >
                {state.title}
              </h2>
              <div
                id="confirm-desc"
                className="mt-2 text-sm text-slate-400 leading-relaxed"
              >
                {state.message}
              </div>
            </div>
          </div>
          <div className="mt-7 flex items-center justify-end gap-3">
            <button
              ref={cancelRef}
              onClick={() => onClose(false)}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
            >
              {state.cancelLabel ?? 'Cancel'}
            </button>
            <button
              onClick={() => onClose(true)}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 ${confirmStyles}`}
            >
              {state.confirmLabel ?? 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}
