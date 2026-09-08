import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';

export type AlertVariant = 'success' | 'warning' | 'error' | 'info';

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children?: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

const icons: Record<AlertVariant, React.ReactNode> = {
  success: <CheckCircle size={20} />,
  warning: <AlertTriangle size={20} />,
  error: <AlertCircle size={20} />,
  info: <Info size={20} />,
};

const styles: Record<AlertVariant, { bg: string; border: string; icon: string; text: string }> = {
  success: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    icon: 'text-emerald-600',
    text: 'text-emerald-800',
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: 'text-amber-600',
    text: 'text-amber-800',
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: 'text-red-600',
    text: 'text-red-800',
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'text-blue-600',
    text: 'text-blue-800',
  },
};

export function Alert({
  variant = 'info',
  title,
  children,
  dismissible = false,
  onDismiss,
  className = '',
}: AlertProps) {
  const style = styles[variant];

  return (
    <div
      role="alert"
      className={`
        flex gap-3 p-4 rounded-lg border
        ${style.bg} ${style.border}
        ${className}
      `}
    >
      <div className={`flex-shrink-0 ${style.icon}`}>
        {icons[variant]}
      </div>

      <div className="flex-1 min-w-0">
        {title && (
          <h4 className={`font-semibold mb-1 ${style.text}`}>
            {title}
          </h4>
        )}
        <div className={`text-sm ${style.text} ${title ? '' : 'mt-0.5'}`}>
          {children}
        </div>
      </div>

      {dismissible && (
        <button
          onClick={onDismiss}
          className={`flex-shrink-0 p-1 rounded hover:bg-black/5 transition-colors ${style.icon}`}
          aria-label="Dismiss alert"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

export default Alert;
