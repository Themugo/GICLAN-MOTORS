import { createContext, useContext, useState, useCallback, memo, useEffect, createPortal } from 'react';
import { Check, X, AlertCircle, Info } from 'lucide-react';

// Toast context
const ToastContext = createContext(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// Toast provider
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { ...toast, id }]);

    // Auto dismiss
    if (toast.duration !== 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, toast.duration || 4000);
    }

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const success = useCallback((message, options = {}) => {
    return addToast({ type: 'success', message, ...options });
  }, [addToast]);

  const error = useCallback((message, options = {}) => {
    return addToast({ type: 'error', message, ...options });
  }, [addToast]);

  const info = useCallback((message, options = {}) => {
    return addToast({ type: 'info', message, ...options });
  }, [addToast]);

  const dismiss = useCallback((id) => {
    removeToast(id);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast, success, error, info, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

// Toast icon component
function ToastIcon({ type }) {
  const icons = {
    success: <Check size={16} />,
    error: <X size={16} />,
    info: <Info size={16} />,
  };
  return icons[type] || <Info size={16} />;
}

// Individual toast
function Toast({ toast, onDismiss }) {
  const [isExiting, setIsExiting] = useState(false);

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => onDismiss(), 200);
  }, [onDismiss]);

  useEffect(() => {
    // Allow swipe to dismiss
    let startX = 0;
    let currentX = 0;

    const handleTouchStart = (e) => {
      startX = e.touches[0].clientX;
    };

    const handleTouchMove = (e) => {
      currentX = e.touches[0].clientX;
      const diff = currentX - startX;
      if (diff > 0) {
        e.currentTarget.style.transform = `translateX(${diff}px)`;
        e.currentTarget.style.opacity = 1 - diff / 200;
      }
    };

    const handleTouchEnd = () => {
      const diff = currentX - startX;
      if (diff > 80) {
        handleDismiss();
      } else {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.opacity = '';
      }
    };

    const el = document.getElementById(`toast-${toast.id}`);
    if (el) {
      el.addEventListener('touchstart', handleTouchStart, { passive: true });
      el.addEventListener('touchmove', handleTouchMove, { passive: true });
      el.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      if (el) {
        el.removeEventListener('touchstart', handleTouchStart);
        el.removeEventListener('touchmove', handleTouchMove);
        el.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, [toast.id, handleDismiss]);

  return (
    <div
      id={`toast-${toast.id}`}
      className={`mobile-toast ${isExiting ? 'mobile-toast--exit' : ''}`}
      role="alert"
      aria-live="polite"
    >
      <div className={`mobile-toast__icon mobile-toast__icon--${toast.type}`}>
        <ToastIcon type={toast.type} />
      </div>
      <div className="mobile-toast__content">
        {toast.title && (
          <div className="mobile-toast__title">{toast.title}</div>
        )}
        <div className="mobile-toast__message">{toast.message}</div>
      </div>
      {toast.action && (
        <button
          className="mobile-toast__action"
          onClick={() => {
            toast.action.onClick?.();
            handleDismiss();
          }}
        >
          {toast.action.label}
        </button>
      )}
      <button
        className="mobile-toast__close"
        onClick={handleDismiss}
        aria-label="Dismiss notification"
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          background: 'transparent',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginLeft: 'auto',
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
}

// Toast container
function ToastContainer({ toasts, onDismiss }) {
  if (typeof document === 'undefined' || toasts.length === 0) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        bottom: 'calc(var(--bottom-nav-height) + var(--safe-area-bottom) + 16px)',
        left: 16,
        right: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      {toasts.map(toast => (
        <div key={toast.id} style={{ pointerEvents: 'auto' }}>
          <Toast toast={toast} onDismiss={() => onDismiss(toast.id)} />
        </div>
      ))}
    </div>,
    document.body
  );
}

// Preset toast types for quick use
export const toast = {
  success: (message, options) => {
    console.warn('Toast not initialized. Use useToast hook inside ToastProvider.');
  },
  error: (message, options) => {
    console.warn('Toast not initialized. Use useToast hook inside ToastProvider.');
  },
  info: (message, options) => {
    console.warn('Toast not initialized. Use useToast hook inside ToastProvider.');
  },
};

export default ToastProvider;
