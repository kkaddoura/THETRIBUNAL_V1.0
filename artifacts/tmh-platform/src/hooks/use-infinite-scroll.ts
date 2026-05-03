import { useState, useEffect, useCallback, useRef } from "react";

const PAGE_SIZE = 10;

/**
 * Infinite scroll hook using a callback ref + IntersectionObserver.
 *
 * Key design: after each batch load, the observer is disconnected and
 * reconnected so it gets a fresh intersection event. Without this,
 * the observer only fires on threshold *crossings* — if the sentinel
 * stays in view after loading more items, it would never fire again.
 */
export function useInfiniteScroll<T>(items: T[], pageSize = PAGE_SIZE) {
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Reset when items array identity changes (filter/search/category)
  const itemsRef = useRef(items);
  useEffect(() => {
    if (items !== itemsRef.current) {
      itemsRef.current = items;
      setVisibleCount(pageSize);
    }
  }, [items, pageSize]);

  // Create and attach observer to a node
  const observe = useCallback(
    (node: HTMLDivElement) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            setVisibleCount((prev) => prev + pageSize);
          }
        },
        { threshold: 0 },
      );
      observerRef.current.observe(node);
    },
    [pageSize],
  );

  // Callback ref: fires when sentinel mounts/unmounts
  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      nodeRef.current = node;
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (node) {
        observe(node);
      }
    },
    [observe],
  );

  // After each batch load, reconnect the observer so it fires again
  // if the sentinel is still in view.
  useEffect(() => {
    if (nodeRef.current && visibleCount < items.length) {
      observe(nodeRef.current);
    }
  }, [visibleCount, items.length, observe]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  const visibleItems = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;

  const expandTo = useCallback(
    (index: number) => {
      if (index >= visibleCount) {
        setVisibleCount(index + 5);
      }
    },
    [visibleCount],
  );

  return { sentinelRef, visibleItems, hasMore, expandTo } as const;
}
