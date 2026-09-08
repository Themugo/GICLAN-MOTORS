import { useCallback, useMemo, useRef, useEffect, useState } from 'react';

// Stable callback that only changes when dependencies change
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  const callbackRef = useRef(callback);
  const stableFnRef = useRef<T | undefined>(undefined);
  const prevDepsRef = useRef<React.DependencyList | undefined>(undefined);

  // Update ref on each render
  useEffect(() => {
    callbackRef.current = callback;
  });

  const depsChanged =
    !prevDepsRef.current ||
    deps.length !== prevDepsRef.current.length ||
    deps.some((dep, i) => dep !== prevDepsRef.current![i]);

  if (depsChanged || !stableFnRef.current) {
    stableFnRef.current = ((...args: any[]) => callbackRef.current(...args)) as T;
    prevDepsRef.current = deps;
  }

  return stableFnRef.current;
}

// Memoize expensive computations
export function useMemoized<T>(factory: () => T, deps: React.DependencyList): T {
  const valueRef = useRef<T | undefined>(undefined);
  const prevDepsRef = useRef<React.DependencyList | undefined>(undefined);

  const depsChanged =
    !prevDepsRef.current ||
    deps.length !== prevDepsRef.current.length ||
    deps.some((dep, i) => dep !== prevDepsRef.current![i]);

  if (depsChanged || valueRef.current === undefined) {
    valueRef.current = factory();
    prevDepsRef.current = deps;
  }

  return valueRef.current;
}

// Create a stable reference that only updates when value changes
export function useStableRef<T>(value: T): React.MutableRefObject<T> {
  const ref = useRef(value);

  if (ref.current !== value) {
    ref.current = value;
  }

  return ref;
}

// Batch multiple state updates for better performance
export function useBatchedUpdates() {
  const pendingUpdates = useRef<(() => void)[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scheduleUpdate = useCallback((update: () => void) => {
    pendingUpdates.current.push(update);

    if (!timeoutRef.current) {
      timeoutRef.current = setTimeout(() => {
        // Execute all pending updates
        pendingUpdates.current.forEach(update => update());
        pendingUpdates.current = [];
        timeoutRef.current = null;
      }, 0);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return scheduleUpdate;
}

// Throttle function calls
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastCall = useRef(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback((...args: any[]) => {
    const now = Date.now();
    if (now - lastCall.current >= delay) {
      lastCall.current = now;
      return callback(...args);
    }
  }, [callback, delay]) as T;
}

// Debounce function calls
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback((...args: any[]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]) as T;
}

// List virtualization helper - calculate visible items
export function useVirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 3,
}: {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}) {
  const scrollTop = useRef(0);

  const getVisibleRange = useCallback(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop.current / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length,
      Math.ceil((scrollTop.current + containerHeight) / itemHeight) + overscan
    );
    return { startIndex, endIndex };
  }, [items.length, itemHeight, containerHeight, overscan]);

  const totalHeight = items.length * itemHeight;
  const { startIndex, endIndex } = getVisibleRange();

  const visibleItems = items.slice(startIndex, endIndex);
  const offsetY = startIndex * itemHeight;

  return {
    virtualItems: visibleItems,
    totalHeight,
    offsetY,
    startIndex,
    endIndex,
    onScroll: (scrollTopValue: number) => {
      scrollTop.current = scrollTopValue;
    },
  };
}

// Windowing hook for large lists
export function useWindowedList<T>({
  items,
  overscan = 5,
}: {
  items: T[];
  overscan?: number;
}) {
  const [range, setRange] = useState({ start: 0, end: 20 });

  useEffect(() => {
    // Reset when items change
    setRange({ start: 0, end: 20 });
  }, [items.length]);

  const visibleItems = items.slice(
    Math.max(0, range.start - overscan),
    Math.min(items.length, range.end + overscan)
  );

  return {
    visibleItems,
    totalItems: items.length,
    startIndex: range.start - overscan,
    setRange,
  };
}

// Stable comparator for array comparisons
export function useStableComparator<T>(
  items: T[],
  compareFn: (a: T, b: T) => number
): T[] {
  const prevItemsRef = useRef(items);
  const prevCompareFnRef = useRef(compareFn);

  return useMemo(() => {
    if (
      prevItemsRef.current === items &&
      prevCompareFnRef.current === compareFn
    ) {
      return prevItemsRef.current;
    }

    prevItemsRef.current = items;
    prevCompareFnRef.current = compareFn;

    return [...items].sort(compareFn);
  }, [items, compareFn]);
}

// Debug hook for re-render tracking
export function useRenderCount(name: string = 'Component') {
  const countRef = useRef(0);
  countRef.current++;

  useEffect(() => {
    console.log(`${name} rendered ${countRef.current} times`);
  });

  return countRef.current;
}

// Performance marker
export function usePerformanceMark(label: string, active: boolean = true) {
  useEffect(() => {
    if (active && performance && performance.mark) {
      performance.mark(label);
      return () => {
        performance.mark(`${label}-end`);
        performance.measure(label, label, `${label}-end`);
      };
    }
  }, [label, active]);
}

export default {
  useStableCallback,
  useMemoized,
  useStableRef,
  useBatchedUpdates,
  useThrottledCallback,
  useDebouncedCallback,
  useVirtualList,
  useWindowedList,
  useStableComparator,
  useRenderCount,
  usePerformanceMark,
};
