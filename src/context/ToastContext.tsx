import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

type ToastType = 'success' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const icons = {
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
};

const colors = {
  success: 'text-safe border-safe/30',
  info: 'text-cyan-glow border-cyan/30',
  warning: 'text-caution border-caution/30',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const dismiss = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 max-w-sm">
        {toasts.map((t) => {
          const Icon = icons[t.type];
          return (
            <div
              key={t.id}
              className={`glass-panel px-4 py-3 flex items-start gap-3 animate-[float_0.3s_ease-out] ${colors[t.type]}`}
            >
              <Icon className="w-5 h-5 mt-0.5 shrink-0" />
              <p className="text-sm text-white font-body flex-1">{t.message}</p>
              <button onClick={() => dismiss(t.id)} className="text-gray-500 hover:text-white shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
