import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Tracks which chapter block sits in the vertical middle band of the viewport.
 * Returns the active index, the set of chapters already seen (so their
 * animations stay in their final state), and a ref-callback factory.
 * Without IntersectionObserver every chapter is treated as seen.
 */
export function useActiveChapter(count: number) {
  const nodesRef = useRef<Array<HTMLElement | null>>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [seen, setSeen] = useState<ReadonlySet<number>>(() =>
    typeof IntersectionObserver === 'undefined'
      ? new Set(Array.from({ length: count }, (_, i) => i))
      : new Set([0])
  );

  const registerChapter = useCallback(
    (index: number) => (node: HTMLElement | null) => {
      nodesRef.current[index] = node;
    },
    []
  );

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;

    const activeObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = nodesRef.current.indexOf(entry.target as HTMLElement);
          if (index < 0) continue;
          setActiveIndex(index);
          setSeen((prev) => (prev.has(index) ? prev : new Set(prev).add(index)));
        }
      },
      { rootMargin: '-40% 0px -40% 0px', threshold: 0 }
    );

    // Forgiving visibility observer ensures inline mobile stages animate regardless of scroll speed or viewport height
    const seenObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = nodesRef.current.indexOf(entry.target as HTMLElement);
          if (index < 0) continue;
          setSeen((prev) => (prev.has(index) ? prev : new Set(prev).add(index)));
        }
      },
      { threshold: 0.12 }
    );

    for (const node of nodesRef.current) {
      if (node) {
        activeObserver.observe(node);
        seenObserver.observe(node);
      }
    }
    return () => {
      activeObserver.disconnect();
      seenObserver.disconnect();
    };
  }, [count]);

  return { activeIndex, seen, registerChapter };
}
