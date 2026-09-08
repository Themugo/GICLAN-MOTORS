import { useState, useEffect } from 'react';

/**
 * Hook to track media query matches
 * @param query - CSS media query string
 * @returns Boolean indicating if the query matches
 */
export default function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mq = window.matchMedia(query);

    // Set initial value
    setMatches(mq.matches);

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);

    // Use addEventListener for modern browsers
    if (mq.addEventListener) {
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    } else {
      // Fallback for older browsers
      mq.addListener(handler);
      return () => mq.removeListener(handler);
    }
  }, [query]);

  return matches;
}

// ============================================================
// Common Breakpoints (for convenience)
// ============================================================

export const useIsMobile = () => useMediaQuery('(max-width: 640px)');
export const useIsTablet = () => useMediaQuery('(min-width: 641px) and (max-width: 1024px)');
export const useIsDesktop = () => useMediaQuery('(min-width: 1025px)');
export const usePrefersDarkMode = () => useMediaQuery('(prefers-color-scheme: dark)');
export const usePrefersReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)');
