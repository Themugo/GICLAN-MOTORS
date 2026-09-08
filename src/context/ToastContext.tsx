import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// Local type definitions (types/index.ts has these)
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  toast: (message: string, type?: ToastType) => void;
}

const ToastCtx = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION = 4000;

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(({ type, message, duration = DEFAULT_DURATION }: Omit<Toast, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts((prev) => [...prev, { id, type, message, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback((message: string, duration?: number) => {
    addToast({ type: 'success', message, duration });
  }, [addToast]);

  const error = useCallback((message: string, duration?: number) => {
    addToast({ type: 'error', message, duration });
  }, [addToast]);

  const warning = useCallback((message: string, duration?: number) => {
    addToast({ type: 'warning', message, duration });
  }, [addToast]);

  const info = useCallback((message: string, duration?: number) => {
    addToast({ type: 'info', message, duration });
  }, [addToast]);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    addToast({ type, message });
  }, [addToast]);

  return (
    <ToastCtx.Provider value={{ toasts, addToast, removeToast, success, error, warning, info, toast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastCtx.Provider>
  );
}

// Toast Container Component
interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }}
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  );
}

// Individual Toast Item
interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const icons: Record<ToastType, string> = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
  };

  const borderColors: Record<ToastType, string> = {
    success: '#22C55E',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
  };

  return (
    <div
      role="alert"
      className={`toast toast-${toast.type}`}
      style={{
        background: 'var(--card)',
        border: `1px solid ${borderColors[toast.type]}`,
        borderRadius: 'var(--radius)',
        padding: '14px 20px',
        fontSize: 14,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        animation: 'slideInRight 0.3s ease',
        maxWidth: 360,
        cursor: 'pointer',
      }}
      onClick={() => onRemove(toast.id)}
    >
      <span className="toast-icon" aria-hidden="true">
        {icons[toast.type]}
      </span>
      {toast.message}
    </div>
  );
}

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastCtx);
  if (!context) {
    // Return a no-op context if not in provider (for testing)
    return {
      toasts: [],
      addToast: () => {},
      removeToast: () => {},
      success: () => {},
      error: () => {},
      warning: () => {},
      info: () => {},
      toast: () => {},
    };
  }
  return context;
};
