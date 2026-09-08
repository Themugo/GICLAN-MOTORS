import { useCallback, useRef, useEffect } from 'react';

export interface UseInfiniteScrollOptions {
  threshold?: number;
  rootMargin?: string;
}

export interface UseInfiniteScrollReturn {
  sentinelRef: React.RefCallback<HTMLElement | null>;
  observer: IntersectionObserver | null;
}

/**
 * Hook for implementing infinite scroll using IntersectionObserver
 * @param onLoadMore - Callback when sentinel becomes visible
 * @param hasMore - Whether there are more items to load
 * @param options - Configuration options
 * @returns Sentinel ref to attach to the last item
 */
export function useInfiniteScroll(
  onLoadMore: () => void,
  hasMore: boolean,
  options: UseInfiniteScrollOptions = {}
): UseInfiniteScrollReturn {
  const { threshold = 0, rootMargin = '300px' } = options;

  const observerRef = useRef<IntersectionObserver | null>(null);

  const sentinelRef = useCallback(
    (node: HTMLElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      if (!node || !hasMore) return;

      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            onLoadMore();
          }
        },
        {
          rootMargin,
          threshold,
        }
      );

      observerRef.current.observe(node);
    },
    [onLoadMore, hasMore, rootMargin, threshold]
  );

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  return {
    sentinelRef,
    observer: observerRef.current,
  };
}

export default useInfiniteScroll;
