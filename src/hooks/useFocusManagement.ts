// src/hooks/useFocusManagement.ts
import { useEffect, useRef } from 'react';

/**
 * Custom hook for managing focus in components
 * Used for modals, dropdowns, and other focus-trapping scenarios
 */
export function useFocusManagement(isOpen: boolean) {
  const containerRef = useRef<HTMLElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Save the currently focused element
      previousActiveElementRef.current = document.activeElement as HTMLElement;

      // Focus the first focusable element in the container
      if (containerRef.current) {
        const focusableElements = getFocusableElements(containerRef.current);
        if (focusableElements.length > 0) {
          focusableElements[0].focus();
        }
      }

      // Add event listener for Tab key trapping
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Tab' && containerRef.current) {
          const focusableElements = getFocusableElements(containerRef.current);
          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];

          if (e.shiftKey) {
            // Shift + Tab
            if (document.activeElement === firstElement) {
              e.preventDefault();
              lastElement.focus();
            }
          } else {
            // Tab
            if (document.activeElement === lastElement) {
              e.preventDefault();
              firstElement.focus();
            }
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);

      return () => {
        document.removeEventListener('keydown', handleKeyDown);

        // Restore focus to previous element when closed
        if (previousActiveElementRef.current) {
          previousActiveElementRef.current.focus();
        }
      };
    }
  }, [isOpen]);

  return containerRef;
}

/**
 * Get all focusable elements within a container
 */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ];

  const focusableElements = container.querySelectorAll(focusableSelectors.join(', '));
  return Array.from(focusableElements) as HTMLElement[];
}

/**
 * Hook for skip navigation functionality
 */
export function useSkipNavigation() {
  const handleSkip = (targetId: string) => {
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return { handleSkip };
}
