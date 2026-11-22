import { useEffect, useRef } from 'react';

export interface ScrollProgressOptions {
  /** Viewport fraction (0-1) where the element top must sit for progress to start at 0. */
  start?: number;
  /** Viewport fraction (0-1) where the element bottom must sit for progress to reach 1. */
  end?: number;
  /** Static CSS variable fallback written when prefers-reduced-motion is active (defaults to 1). */
  reducedValue?: number;
}

export const SCROLL_PROGRESS_VAR = '--scroll-progress';

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Writes the element's scroll progress (0 to 1) into the `--scroll-progress`
 * CSS custom property on every animation frame while scrolling.
 * Children read `var(--scroll-progress, 1)` so no React re-render happens per frame.
 * Reduced-motion users get a static value of 1 (final state).
 */
export function useScrollProgress<T extends HTMLElement>({
  start = 0.85,
  end = 0.35,
  reducedValue = 1
}: ScrollProgressOptions = {}) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (prefersReducedMotion()) {
      node.style.setProperty(SCROLL_PROGRESS_VAR, String(reducedValue));
      return;
    }

    let frame = 0;

    const update = () => {
      frame = 0;
      const rect = node.getBoundingClientRect();
      const viewport = window.innerHeight || 1;
      const distance = viewport * (start - end) + rect.height;
      const raw = distance > 0 ? (viewport * start - rect.top) / distance : 1;
      const progress = Math.min(1, Math.max(0, raw));
      node.style.setProperty(SCROLL_PROGRESS_VAR, progress.toFixed(4));
    };

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);

    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [start, end, reducedValue]);

  return ref;
}
