import React, { ReactNode, useEffect, useRef, useState } from 'react';

export interface RevealOnScrollProps {
  children: ReactNode;
  className?: string;
  delayMs?: number;
  direction?: 'up' | 'left' | 'right' | 'none';
}

function getHiddenTransform(direction: RevealOnScrollProps['direction']): string {
  switch (direction) {
    case 'left':
      return 'translate-x-4';
    case 'right':
      return '-translate-x-4';
    case 'none':
      return '';
    case 'up':
    default:
      return 'translate-y-4';
  }
}

/**
 * Progressive scroll-reveal wrapper using IntersectionObserver.
 * Falls back immediately to visible when observers are unavailable or
 * when the user prefers reduced motion.
 */
export const RevealOnScroll: React.FC<RevealOnScrollProps> = ({
  children,
  className = '',
  delayMs = 0,
  direction = 'up'
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
      return true;
    }
    if (typeof window.matchMedia === 'function') {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (isVisible) return;
    const node = containerRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -32px 0px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [isVisible]);

  const hiddenOffset = getHiddenTransform(direction);

  return (
    <div
      ref={containerRef}
      style={delayMs > 0 ? { transitionDelay: `${delayMs}ms` } : undefined}
      className={`transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none motion-reduce:transform-none ${
        isVisible ? 'opacity-100 translate-x-0 translate-y-0' : `opacity-0 ${hiddenOffset}`
      } ${className}`}
    >
      {children}
    </div>
  );
};
