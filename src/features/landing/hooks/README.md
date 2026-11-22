# Landing Hooks

## Overview
Custom React hooks powering scroll-driven progress and sticky storytelling chapter tracking on the public landing page.

## Interface
- `useActiveChapter.ts:useActiveChapter(count: number)`: Returns `{ activeIndex: number; seen: ReadonlySet<number>; registerChapter: (index: number) => (node: HTMLElement | null) => void }`.
- `useScrollProgress.ts:SCROLL_PROGRESS_VAR`: Constant `'--scroll-progress'`.
- `useScrollProgress.ts:ScrollProgressOptions`: Interface `{ start?: number; end?: number; reducedValue?: number }`.
- `useScrollProgress.ts:useScrollProgress<T extends HTMLElement>(options?: ScrollProgressOptions)`: Returns `RefObject<T | null>`.

## Invariants
- `useActiveChapter`: When `IntersectionObserver` is unavailable, `seen` initializes with all indices `0..count-1`; otherwise `seen` initializes with `Set([0])`.
- `useScrollProgress`: Clamps scroll progress to `[0, 1]` formatted with `toFixed(4)` (defaults: `start = 0.85`, `end = 0.35`, `reducedValue = 1`). Under `prefers-reduced-motion: reduce`, writes `String(reducedValue)` once and does not attach scroll/resize listeners.

## Side Effects
- `useActiveChapter`: Observes registered chapter elements with two `IntersectionObserver` instances (`rootMargin: '-40% 0px -40% 0px'` for `activeIndex`, `threshold: 0.12` for `seen`) and disconnects them on cleanup.
- `useScrollProgress`: Writes `--scroll-progress` directly to `node.style` inside `requestAnimationFrame` (without React re-renders) and registers/cleans up `window` `scroll` (passive) and `resize` listeners.

## Verification
- Run: `npm test -- --run`
