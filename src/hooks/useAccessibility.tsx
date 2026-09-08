import { useEffect, useCallback, useRef, useState } from 'react';

// Focus trap for modals and dialogs
export function useFocusTrap(isActive: boolean = true) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive) return;

    // Store the previously focused element
    previousFocusRef.current = document.activeElement as HTMLElement;

    const container = containerRef.current;
    if (!container) return;

    // Get all focusable elements
    const getFocusableElements = () => {
      return container.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
    };

    // Focus the first focusable element
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusable = getFocusableElements();
      if (focusable.length === 0) return;

      const firstElement = focusable[0];
      const lastElement = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      // Restore focus when unmounting
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [isActive]);

  return containerRef;
}

// Keyboard navigation for lists and grids
export function useKeyboardNavigation({
  items,
  orientation = 'vertical',
  loop = true,
  onSelect,
}: {
  items: any[];
  orientation?: 'vertical' | 'horizontal' | 'grid';
  loop?: boolean;
  onSelect?: (index: number) => void;
}) {
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (items.length === 0) return;

    let newIndex = focusedIndex;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (orientation === 'vertical' || orientation === 'grid') {
          newIndex = focusedIndex + 1;
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (orientation === 'vertical' || orientation === 'grid') {
          newIndex = focusedIndex - 1;
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (orientation === 'horizontal' || orientation === 'grid') {
          newIndex = focusedIndex + 1;
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (orientation === 'horizontal' || orientation === 'grid') {
          newIndex = focusedIndex - 1;
        }
        break;
      case 'Home':
        e.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        newIndex = items.length - 1;
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedIndex >= 0 && onSelect) {
          onSelect(focusedIndex);
        }
        break;
      default:
        return;
    }

    // Handle bounds
    if (newIndex < 0) {
      newIndex = loop ? items.length - 1 : 0;
    } else if (newIndex >= items.length) {
      newIndex = loop ? 0 : items.length - 1;
    }

    setFocusedIndex(newIndex);
  }, [focusedIndex, items.length, loop, orientation, onSelect]);

  return {
    focusedIndex,
    setFocusedIndex,
    handleKeyDown,
    isFocused: (index: number) => focusedIndex === index,
  };
}

// Announce messages to screen readers
export function useAnnounce() {
  const [message, setMessage] = useState('');
  const [politeness, setPoliteness] = useState<'polite' | 'assertive'>('polite');

  const announce = useCallback((msg: string, level: 'polite' | 'assertive' = 'polite') => {
    setPoliteness(level);
    setMessage('');
    // Small delay to ensure the screen reader picks up the change
    setTimeout(() => setMessage(msg), 50);
  }, []);

  const Announcer = useCallback(() => (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  ), [message, politeness]);

  return { announce, Announcer };
}

// Skip link hook
export function useSkipLink(targetId: string, label: string = 'Skip to content') {
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.tabIndex = -1;
      target.focus();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  }, [targetId]);

  return { targetId, label, handleClick };
}

// Reduced motion preference
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
}

// Animation helper with reduced motion support
export function getAnimationClass(
  prefersReducedMotion: boolean,
  normalClass: string,
  reducedMotionClass: string = 'transition-none'
): string {
  return prefersReducedMotion ? reducedMotionClass : normalClass;
}

// Escape key handler
export function useEscapeKey(callback: () => void, isActive: boolean = true) {
  useEffect(() => {
    if (!isActive) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        callback();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [callback, isActive]);
}

// Trap scroll when modal is open
export function useScrollLock(isActive: boolean = true) {
  useEffect(() => {
    if (!isActive) return;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;

    // Calculate scrollbar width
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [isActive]);
}

// Generate unique IDs for accessibility
let idCounter = 0;
export function generateId(prefix: string = 'id'): string {
  return `${prefix}-${++idCounter}`;
}

// Merge aria attributes
export function mergeAriaProps(
  baseProps: Record<string, any>,
  additionalProps: Record<string, any>
): Record<string, any> {
  const result = { ...baseProps };

  if (additionalProps['aria-describedby']) {
    result['aria-describedby'] = [
      baseProps['aria-describedby'],
      additionalProps['aria-describedby'],
    ].filter(Boolean).join(' ');
  }

  return { ...result, ...additionalProps };
}

export default {
  useFocusTrap,
  useKeyboardNavigation,
  useAnnounce,
  useSkipLink,
  useReducedMotion,
  getAnimationClass,
  useEscapeKey,
  useScrollLock,
  generateId,
  mergeAriaProps,
};
