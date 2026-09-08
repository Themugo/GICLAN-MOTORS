// High-performance virtualized list for rendering 100k+ items
// Uses windowing technique to only render visible items + buffer

import { useState, useEffect, useRef, useCallback, useMemo, memo, type CSSProperties, type ReactNode, type ComponentType, type UIEvent } from 'react';
import useIntersectionObserver from '../../../hooks/useIntersectionObserver';

interface VirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  estimatedItemHeight?: number;
  overscan?: number;
  className?: string;
  style?: CSSProperties;
  onEndReached?: () => void;
  onEndReachedThreshold?: number;
  ListFooter?: ComponentType;
  ListEmpty?: ComponentType;
  keyExtractor?: (item: T, index: number) => string;
  horizontal?: boolean;
}

interface VirtualListState {
  scrollTop: number;
  containerHeight: number;
  visibleRange: { start: number; end: number };
}

export default function VirtualList<T>({
  items,
  renderItem,
  estimatedItemHeight = 300,
  overscan = 3,
  className,
  style,
  onEndReached,
  onEndReachedThreshold = 0.9,
  ListFooter,
  ListEmpty,
  keyExtractor = (item, index) => String(index),
  horizontal = false,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<VirtualListState>({
    scrollTop: 0,
    containerHeight: horizontal ? 0 : 400,
    visibleRange: { start: 0, end: 10 },
  });

  // Store item heights in a ref to handle dynamic heights
  const itemHeightsRef = useRef<Map<number, number>>(new Map());
  const measuredItemsRef = useRef<Set<number>>(new Set());

  // Calculate total height based on item heights
  const totalHeight = useMemo(() => {
    if (horizontal) return estimatedItemHeight;

    let total = 0;
    for (let i = 0; i < items.length; i++) {
      total += itemHeightsRef.current.get(i) || estimatedItemHeight;
    }
    return total || estimatedItemHeight * items.length;
  }, [items.length, estimatedItemHeight, horizontal]);

  // Calculate visible range
  const calculateVisibleRange = useCallback(() => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const containerHeight = horizontal ? rect.width : rect.height;
    const scrollOffset = horizontal
      ? containerRef.current.scrollLeft
      : state.scrollTop;

    if (items.length === 0 || containerHeight === 0) {
      setState(prev => ({
        ...prev,
        containerHeight,
        visibleRange: { start: 0, end: 0 },
      }));
      return;
    }

    let startIndex = 0;
    let accumulatedHeight = 0;

    // Find start index
    for (let i = 0; i < items.length; i++) {
      const height = itemHeightsRef.current.get(i) || estimatedItemHeight;
      if (accumulatedHeight + height > scrollOffset) {
        startIndex = i;
        break;
      }
      accumulatedHeight += height;
      if (i === items.length - 1) startIndex = i;
    }

    // Find end index
    let endIndex = startIndex;
    accumulatedHeight = 0;
    for (let i = 0; i <= startIndex; i++) {
      accumulatedHeight += itemHeightsRef.current.get(i) || estimatedItemHeight;
    }

    const viewportBottom = scrollOffset + containerHeight;
    for (let i = startIndex; i < items.length; i++) {
      const height = itemHeightsRef.current.get(i) || estimatedItemHeight;
      accumulatedHeight += height;
      endIndex = i;
      if (accumulatedHeight >= viewportBottom) break;
    }

    // Apply overscan
    startIndex = Math.max(0, startIndex - overscan);
    endIndex = Math.min(items.length - 1, endIndex + overscan);

    setState(prev => ({
      ...prev,
      containerHeight,
      visibleRange: { start: startIndex, end: endIndex },
    }));
  }, [items.length, estimatedItemHeight, overscan, state.scrollTop, horizontal]);

  // Handle scroll
  const handleScroll = useCallback((e: UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrollTop = horizontal ? target.scrollLeft : target.scrollTop;

    setState(prev => ({ ...prev, scrollTop }));
  }, [horizontal]);

  // Measure item after render
  const measureItemRef = useCallback((index: number, element: HTMLElement | null) => {
    if (!element) return;

    const height = horizontal ? element.offsetWidth : element.offsetHeight;

    if (itemHeightsRef.current.get(index) !== height) {
      itemHeightsRef.current.set(index, height);
      measuredItemsRef.current.add(index);
      calculateVisibleRange();
    }
  }, [calculateVisibleRange, horizontal]);

  // Re-calculate when items change
  useEffect(() => {
    calculateVisibleRange();
  }, [calculateVisibleRange, items.length]);

  // Handle resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      calculateVisibleRange();
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [calculateVisibleRange]);

  // Infinite scroll trigger
  useEffect(() => {
    if (!onEndReached) return;

    const container = containerRef.current;
    if (!container) return;

    const handleInfiniteScroll = () => {
      const scrollHeight = horizontal ? container.scrollWidth : container.scrollHeight;
      const scrollPosition = horizontal ? container.scrollLeft + container.clientWidth : container.scrollTop + container.clientHeight;
      const threshold = scrollHeight * onEndReachedThreshold;

      if (scrollPosition >= threshold) {
        onEndReached();
      }
    };

    container.addEventListener('scroll', handleInfiniteScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleInfiniteScroll);
  }, [onEndReached, onEndReachedThreshold, horizontal]);

  // Get item offset
  const getItemOffset = useCallback((index: number) => {
    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += itemHeightsRef.current.get(i) || estimatedItemHeight;
    }
    return offset;
  }, [estimatedItemHeight]);

  // Empty state
  if (items.length === 0) {
    return ListEmpty ? <ListEmpty /> : null;
  }

  const { visibleRange } = state;
  const visibleItems: { item: T; index: number; offset: number }[] = [];

  for (let i = visibleRange.start; i <= visibleRange.end; i++) {
    if (items[i] !== undefined) {
      visibleItems.push({
        item: items[i],
        index: i,
        offset: getItemOffset(i),
      });
    }
  }

  const containerStyle: CSSProperties = {
    ...style,
    overflow: horizontal ? 'auto hidden' : 'hidden auto',
    position: 'relative',
  };

  const contentStyle: CSSProperties = horizontal
    ? {
        display: 'flex',
        flexDirection: 'row',
        width: totalHeight,
        height: '100%',
      }
    : {
        height: totalHeight,
        width: '100%',
        position: 'relative',
      };

  return (
    <div
      ref={containerRef}
      className={className}
      style={containerStyle}
      onScroll={handleScroll}
    >
      <div style={contentStyle}>
        {visibleItems.map(({ item, index, offset }) => (
          <div
            key={keyExtractor(item, index)}
            ref={(el) => measureItemRef(index, el)}
            style={{
              position: 'absolute',
              ...(horizontal
                ? { height: '100%', left: offset }
                : { width: '100%', top: offset }),
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
      {ListFooter && <ListFooter />}
    </div>
  );
}

// Simplified version for simple row-based lists
interface SimpleVirtualListProps<T> {
  items: T[];
  renderRow: (item: T, index: number) => ReactNode;
  rowHeight: number;
  className?: string;
  style?: CSSProperties;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loadingComponent?: ReactNode;
}

export function SimpleVirtualList<T>({
  items,
  renderRow,
  rowHeight,
  className,
  style,
  onLoadMore,
  hasMore = false,
  loadingComponent,
}: SimpleVirtualListProps<T>) {
  const [visibleCount, setVisibleCount] = useState(20);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [, sentinelEntry] = useIntersectionObserver({ threshold: 0.1 });

  // Show more items when sentinel is visible
  useEffect(() => {
    if (sentinelEntry?.isIntersecting && hasMore) {
      setVisibleCount(prev => prev + 20);
      onLoadMore?.();
    }
  }, [sentinelEntry, hasMore, onLoadMore]);

  const visibleItems = useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);

  return (
    <div className={className} style={{ ...style, overflow: 'auto' }}>
      {visibleItems.map((item, index) => (
        <div key={index} style={{ height: rowHeight, flexShrink: 0 }}>
          {renderRow(item, index)}
        </div>
      ))}
      <div ref={sentinelRef} style={{ height: 1 }} />
      {loadingComponent && hasMore && (
        <div style={{ padding: 16, textAlign: 'center' }}>
          {loadingComponent}
        </div>
      )}
    </div>
  );
}
