// Optimized API hook with caching, request deduplication, and automatic cleanup
// Supports optimistic updates, background refetch, and stale-while-revalidate

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  promise?: Promise<T>;
}

interface UseApiOptions<T> {
  // Cache configuration
  ttl?: number; // Time to live in milliseconds (default: 30000 = 30s)
  staleTime?: number; // Time before data is considered stale (default: 60000 = 1m)

  // Request configuration
  enabled?: boolean;
  revalidateOnFocus?: boolean;
  revalidateOnReconnect?: boolean;
  revalidateOnMount?: boolean;

  // Optimistic updates
  optimisticUpdate?: (currentData: T | undefined, variables: any) => T;
  onOptimisticUpdate?: (data: T) => void;

  // Callbacks
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  onSettled?: (data: T | undefined, error: Error | null) => void;
}

interface UseApiResult<T> {
  data: T | undefined;
  error: Error | null;
  isLoading: boolean;
  isFetching: boolean;
  isStale: boolean;
  refetch: () => Promise<T | undefined>;
  mutate: (data: T | ((prev: T | undefined) => T)) => void;
  reset: () => void;
}

// Global cache store
const globalCache = new Map<string, CacheEntry<any>>();
const inflightRequests = new Map<string, Promise<any>>();

// Cache cleanup interval (runs every 5 minutes)
const CACHE_CLEANUP_INTERVAL = 5 * 60 * 1000;

// Cleanup function
function cleanupCache() {
  const now = Date.now();
  for (const [key, entry] of globalCache.entries()) {
    // Remove entries older than 10 minutes
    if (now - entry.timestamp > 10 * 60 * 1000) {
      globalCache.delete(key);
    }
  }
}

// Start cleanup interval
if (typeof window !== 'undefined') {
  setInterval(cleanupCache, CACHE_CLEANUP_INTERVAL);
}

// Generate cache key from function and arguments
function getCacheKey(fetcher: string | (() => Promise<any>), args?: any): string {
  if (typeof fetcher === 'string') {
    return args ? `${fetcher}:${JSON.stringify(args)}` : fetcher;
  }
  return `${fetcher.toString()}:${JSON.stringify(args)}`;
}

export function useApi<T>(
  fetcher: () => Promise<T>,
  options: UseApiOptions<T> = {}
): UseApiResult<T> {
  const {
    ttl = 30000,
    staleTime = 60000,
    enabled = true,
    revalidateOnFocus = false,
    revalidateOnReconnect = false,
    revalidateOnMount = true,
    onSuccess,
    onError,
    onSettled,
  } = options;

  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isStale, setIsStale] = useState(false);

  const mountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const cacheKey = useRef(getCacheKey(fetcher.toString().slice(0, 100), undefined));

  // Check if data is stale
  const checkStale = useCallback((key: string): boolean => {
    const entry = globalCache.get(key);
    if (!entry) return true;
    return Date.now() - entry.timestamp > staleTime;
  }, [staleTime]);

  // Get cached data
  const getCachedData = useCallback((key: string): T | null => {
    const entry = globalCache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > ttl) {
      globalCache.delete(key);
      return null;
    }
    return entry.data;
  }, [ttl]);

  // Set cached data
  const setCachedData = useCallback((key: string, newData: T) => {
    globalCache.set(key, { data: newData, timestamp: Date.now() });
  }, []);

  // Fetch with deduplication
  const fetchData = useCallback(async (): Promise<T | undefined> => {
    if (!enabled) return undefined;

    // Check cache first
    const cachedData = getCachedData(cacheKey.current);
    if (cachedData !== null && !checkStale(cacheKey.current)) {
      return cachedData;
    }

    // Check if request is already in flight
    if (inflightRequests.has(cacheKey.current)) {
      return inflightRequests.get(cacheKey.current);
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsFetching(true);
    setIsStale(checkStale(cacheKey.current));

    const fetchPromise = fetcher()
      .then((result) => {
        if (!mountedRef.current) return undefined;

        setCachedData(cacheKey.current, result);
        setData(result);
        setError(null);
        setIsStale(false);
        onSuccess?.(result);

        return result;
      })
      .catch((err) => {
        if (!mountedRef.current || err.name === 'AbortError') return undefined;

        setError(err);
        onError?.(err);

        return undefined;
      })
      .finally(() => {
        if (!mountedRef.current) return;
        setIsLoading(false);
        setIsFetching(false);
        inflightRequests.delete(cacheKey.current);
      });

    inflightRequests.set(cacheKey.current, fetchPromise as Promise<any>);

    return fetchPromise;
  }, [fetcher, enabled, getCachedData, setCachedData, checkStale, onSuccess, onError]);

  // Initial fetch and revalidation
  useEffect(() => {
    if (!enabled) return;

    mountedRef.current = true;

    // Check if we have cached data
    const cachedData = getCachedData(cacheKey.current);
    if (cachedData !== null) {
      setData(cachedData);
      setIsStale(checkStale(cacheKey.current));

      // Revalidate if stale or on mount
      if (revalidateOnMount || checkStale(cacheKey.current)) {
        setIsLoading(true);
        fetchData();
      }
    } else {
      setIsLoading(true);
      fetchData();
    }

    // Focus revalidation
    if (revalidateOnFocus) {
      const handleFocus = () => {
        if (checkStale(cacheKey.current)) {
          fetchData();
        }
      };
      window.addEventListener('focus', handleFocus);

      return () => {
        window.removeEventListener('focus', handleFocus);
      };
    }

    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetcher, enabled, revalidateOnMount, revalidateOnFocus, getCachedData, checkStale, fetchData]);

  // Reconnect revalidation
  useEffect(() => {
    if (!revalidateOnReconnect) return;

    const handleOnline = () => {
      if (checkStale(cacheKey.current)) {
        fetchData();
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [revalidateOnReconnect, checkStale, fetchData]);

  // Refetch function
  const refetch = useCallback(async () => {
    setIsLoading(true);
    return fetchData();
  }, [fetchData]);

  // Mutate function (optimistic updates)
  const mutate = useCallback((newData: T | ((prev: T | undefined) => T)) => {
    const resolvedData = typeof newData === 'function'
      ? (newData as (prev: T | undefined) => T)(data)
      : newData;

    setData(resolvedData);
    setCachedData(cacheKey.current, resolvedData);
  }, [data, setCachedData]);

  // Reset function
  const reset = useCallback(() => {
    setData(undefined);
    setError(null);
    setIsLoading(false);
    setIsFetching(false);
    setIsStale(false);
    globalCache.delete(cacheKey.current);
  }, []);

  return {
    data,
    error,
    isLoading,
    isFetching,
    isStale,
    refetch,
    mutate,
    reset,
  };
}

// Hook for mutations with optimistic updates
interface UseMutationOptions<TData, TVariables> {
  onMutate?: (variables: TVariables) => TData;
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
  onSettled?: (data: TData | undefined, error: Error | null, variables: TVariables) => void;
}

interface UseMutationResult<TData, TVariables> {
  mutate: (variables: TVariables) => Promise<TData | undefined>;
  mutateAsync: (variables: TVariables) => Promise<TData | undefined>;
  isLoading: boolean;
  error: Error | null;
  data: TData | undefined;
}

export function useMutation<TData, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: UseMutationOptions<TData, TVariables> = {}
): UseMutationResult<TData, TVariables> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<TData | undefined>(undefined);

  const mutate = useCallback(async (variables: TVariables): Promise<TData | undefined> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await mutationFn(variables);
      setData(result);
      options.onSuccess?.(result, variables);
      options.onSettled?.(result, null, variables);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Mutation failed');
      setError(error);
      options.onError?.(error, variables);
      options.onSettled?.(undefined, error, variables);
      return undefined;
    } finally {
      setIsLoading(false);
    }
  }, [mutationFn, options]);

  return {
    mutate,
    mutateAsync: mutate,
    isLoading,
    error,
    data,
  };
}

// Preload data for better UX
export function preloadApi<T>(
  fetcher: () => Promise<T>,
  options: { ttl?: number } = {}
): void {
  const cacheKey = getCacheKey(fetcher.toString().slice(0, 100), undefined);
  const cachedData = globalCache.get(cacheKey);

  if (!cachedData || Date.now() - cachedData.timestamp > (options.ttl || 30000)) {
    fetcher().then((data) => {
      globalCache.set(cacheKey, { data, timestamp: Date.now() });
    }).catch(() => {
      // Silent fail for preloads
    });
  }
}

// Clear specific cache entries
export function clearApiCache(pattern?: string): void {
  if (!pattern) {
    globalCache.clear();
    return;
  }

  for (const key of globalCache.keys()) {
    if (key.includes(pattern)) {
      globalCache.delete(key);
    }
  }
}

// Get cache stats
export function getApiCacheStats(): { size: number; keys: string[] } {
  return {
    size: globalCache.size,
    keys: Array.from(globalCache.keys()),
  };
}
