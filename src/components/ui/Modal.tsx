import { useEffect, useCallback, useRef } from 'react';
import { X } from 'lucide-react';
import { useFocusTrap } from '../../hooks/useAccessibility';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  description?: string;
  children?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  maxWidth?: string;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  footer?: React.ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  closeOnBackdrop = true,
  closeOnEscape = true,
  showCloseButton = true,
  footer,
  className = '',
}) => {
  const focusTrapRef = useFocusTrap(isOpen);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Handle escape key
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape') {
        onClose();
      }
    },
    [closeOnEscape, onClose]
  );

  useEffect(() => {
    if (isOpen) {
      // Store current focus
      previousFocusRef.current = document.activeElement as HTMLElement;

      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';

      // Focus the close button after a brief delay
      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 50);
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
      // Restore focus
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  const sizes: Record<string, React.CSSProperties> = {
    sm: { maxWidth: 400 },
    md: { maxWidth: 500 },
    lg: { maxWidth: 700 },
    xl: { maxWidth: 900 },
  };

  const backdropStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 'var(--z-modal-backdrop)',
    padding: 'var(--space-6)',
    animation: 'fadeIn var(--duration-normal) var(--ease-out)',
  };

  const modalStyle: React.CSSProperties = {
    position: 'relative',
    background: 'var(--color-bg-elevated)',
    borderRadius: 'var(--radius-xl)',
    boxShadow: 'var(--shadow-2xl)',
    width: '100%',
    maxHeight: '85vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 'var(--z-modal)',
    animation: 'scaleIn var(--duration-normal) var(--ease-spring)',
    ...sizes[size],
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 'var(--space-6)',
    borderBottom: '1px solid var(--color-border-soft)',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 'var(--text-h3)',
    fontWeight: 600,
    color: 'var(--color-text-primary)',
    margin: 0,
  };

  const descriptionStyle: React.CSSProperties = {
    fontSize: 'var(--text-body-sm)',
    color: 'var(--color-text-muted)',
    margin: 'var(--space-2) 0 0 0',
  };

  const closeButtonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    padding: 0,
    background: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--color-text-muted)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  };

  const contentStyle: React.CSSProperties = {
    padding: 'var(--space-6)',
    overflowY: 'auto',
    flex: 1,
  };

  const footerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 'var(--space-3)',
    padding: 'var(--space-4) var(--space-6)',
    borderTop: '1px solid var(--color-border-soft)',
    background: 'var(--color-bg-secondary)',
  };

  return (
    <div
      style={backdropStyle}
      onClick={closeOnBackdrop ? onClose : undefined}
      role="presentation"
    >
      <div
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        aria-describedby={description ? 'modal-description' : undefined}
        style={modalStyle}
        className={className}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || showCloseButton) && (
          <div style={headerStyle}>
            <div>
              {title && <h2 id="modal-title" style={titleStyle}>{title}</h2>}
              {description && <p id="modal-description" style={descriptionStyle}>{description}</p>}
            </div>
            {showCloseButton && (
              <button
                ref={closeButtonRef}
                style={closeButtonStyle}
                onClick={onClose}
                aria-label="Close modal"
                className="hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gold-500/30"
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}
        <div style={contentStyle}>{children}</div>
        {footer && <div style={footerStyle}>{footer}</div>}
      </div>
    </div>
  );
};

export default Modal;
