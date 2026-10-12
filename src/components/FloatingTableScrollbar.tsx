import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface FloatingTableScrollbarProps {
  /** Optional external ref to the scrollable element */
  targetRef?: React.RefObject<HTMLElement | null>;
  /** Optional children if used as a wrapper container */
  children?: React.ReactNode;
  /** Class name for the scrollable container when used as a wrapper */
  className?: string;
  /** Class name for the outermost container */
  containerClassName?: string;
}

interface ScrollControlsProps {
  targetElement: HTMLElement;
}

export const FloatingScrollbarControls: React.FC<ScrollControlsProps> = ({ targetElement }) => {
  const [scrollMetrics, setScrollMetrics] = useState({
    scrollLeft: 0,
    scrollWidth: 0,
    clientWidth: 0,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartScrollLeft, setDragStartScrollLeft] = useState(0);
  const [trackWidth, setTrackWidth] = useState(0);

  const trackRef = useRef<HTMLDivElement>(null);

  // Sync metrics from the target element
  const updateMetrics = useCallback(() => {
    if (!targetElement) return;
    setScrollMetrics({
      scrollLeft: targetElement.scrollLeft,
      scrollWidth: targetElement.scrollWidth,
      clientWidth: targetElement.clientWidth,
    });
  }, [targetElement]);

  // Update track width on resize
  const updateTrackWidth = useCallback(() => {
    if (trackRef.current) {
      setTrackWidth(trackRef.current.clientWidth);
    }
  }, []);

  const [viewportStatus, setViewportStatus] = useState<{
    isVisible: boolean;
    isFloating: boolean;
    left: number;
    width: number;
  }>({
    isVisible: true,
    isFloating: false,
    left: 0,
    width: 0,
  });

  // Track viewport visibility and whether table bottom is off-screen
  const updateViewportStatus = useCallback(() => {
    if (!targetElement || typeof targetElement.getBoundingClientRect !== 'function') {
      setViewportStatus({
        isVisible: true,
        isFloating: false,
        left: 0,
        width: 0,
      });
      return;
    }
    const rect = targetElement.getBoundingClientRect();
    const viewportHeight = window.innerHeight || 800;

    // Default for test environments (jsdom) where layout is 0
    if (rect.width === 0 && rect.height === 0 && rect.bottom === 0) {
      setViewportStatus({
        isVisible: true,
        isFloating: false,
        left: 0,
        width: 0,
      });
      return;
    }

    const isVisible = rect.bottom > 60 && rect.top < viewportHeight - 40;
    const isFloating = rect.bottom > viewportHeight && isVisible;

    setViewportStatus({
      isVisible,
      isFloating,
      left: Math.round(rect.left),
      width: Math.round(rect.width),
    });
  }, [targetElement]);

  useEffect(() => {
    if (!targetElement) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    updateMetrics();
    updateTrackWidth();
    updateViewportStatus();

    const handleScroll = () => {
      updateMetrics();
    };

    targetElement.addEventListener('scroll', handleScroll, { passive: true });

    const handleViewportScroll = () => {
      updateViewportStatus();
    };
    window.addEventListener('scroll', handleViewportScroll, { capture: true, passive: true });

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        updateMetrics();
        updateTrackWidth();
        updateViewportStatus();
      });
      resizeObserver.observe(targetElement);
      if (trackRef.current) {
        resizeObserver.observe(trackRef.current);
      }
    }

    const handleWindowResize = () => {
      updateMetrics();
      updateTrackWidth();
      updateViewportStatus();
    };
    window.addEventListener('resize', handleWindowResize, { passive: true });

    return () => {
      targetElement.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', handleViewportScroll, { capture: true });
      window.removeEventListener('resize', handleWindowResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [targetElement, updateMetrics, updateTrackWidth, updateViewportStatus]);

  const { scrollLeft, scrollWidth, clientWidth } = scrollMetrics;
  const maxScroll = Math.max(0, scrollWidth - clientWidth);
  const canScroll = maxScroll > 2;

  // Handle Dragging
  const handleThumbMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragStartX(e.clientX);
    setDragStartScrollLeft(targetElement.scrollLeft);
  };

  const handleThumbTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    setIsDragging(true);
    setDragStartX(e.touches[0].clientX);
    setDragStartScrollLeft(targetElement.scrollLeft);
  };

  useEffect(() => {
    if (!isDragging) return;

    const effectiveTrackWidth = trackWidth;
    const thumbWidth = Math.max(Math.round((clientWidth / scrollWidth) * effectiveTrackWidth), 36);
    const availableTrack = Math.max(1, effectiveTrackWidth - thumbWidth);

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartX;
      const scrollDelta = (deltaX / availableTrack) * maxScroll;
      targetElement.scrollLeft = Math.max(0, Math.min(maxScroll, dragStartScrollLeft + scrollDelta));
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - dragStartX;
      const scrollDelta = (deltaX / availableTrack) * maxScroll;
      targetElement.scrollLeft = Math.max(0, Math.min(maxScroll, dragStartScrollLeft + scrollDelta));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, dragStartX, dragStartScrollLeft, trackWidth, clientWidth, scrollWidth, maxScroll, targetElement]);

  // Click on track to jump
  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current || maxScroll <= 0) return;
    const rect = trackRef.current.getBoundingClientRect();
    const effectiveTrackWidth = rect.width;
    const thumbWidth = Math.max(Math.round((clientWidth / scrollWidth) * effectiveTrackWidth), 36);
    const clickX = e.clientX - rect.left;
    const targetRatio = (clickX - thumbWidth / 2) / Math.max(1, effectiveTrackWidth - thumbWidth);
    const newScroll = Math.max(0, Math.min(maxScroll, targetRatio * maxScroll));
    targetElement.scrollTo({ left: newScroll, behavior: 'smooth' });
  };

  // Step Left / Right Buttons
  const handleStep = (direction: 'left' | 'right') => {
    const stepAmount = Math.max(Math.round(clientWidth * 0.45), 240);
    const delta = direction === 'left' ? -stepAmount : stepAmount;
    targetElement.scrollBy({ left: delta, behavior: 'smooth' });
  };

  if (!canScroll || !viewportStatus.isVisible) {
    return null;
  }

  // Thumb calculations
  const thumbWidth = trackWidth > 0
    ? Math.max(Math.round((clientWidth / scrollWidth) * trackWidth), 36)
    : 36;
  const availableTrack = Math.max(1, trackWidth - thumbWidth);
  const thumbLeft = maxScroll > 0
    ? Math.min(availableTrack, Math.max(0, (scrollLeft / maxScroll) * availableTrack))
    : 0;

  const scrollPercentage = maxScroll > 0 ? Math.round((scrollLeft / maxScroll) * 100) : 0;
  const isAtStart = scrollLeft <= 2;
  const isAtEnd = scrollLeft >= maxScroll - 2;

  return (
    <div
      data-testid="floating-table-scrollbar"
      style={
        viewportStatus.isFloating
          ? {
              position: 'fixed',
              left: `${viewportStatus.left}px`,
              width: `${viewportStatus.width}px`,
              bottom: '1rem',
              zIndex: 40,
            }
          : undefined
      }
      className={`pointer-events-none flex justify-center px-4 py-1 transition-all duration-150 ${
        viewportStatus.isFloating ? '' : 'sticky bottom-3 z-30 w-full -mt-10 mb-2'
      }`}
    >
      <div
        className="pointer-events-auto inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 bg-white/95 dark:bg-neutral-800/95 backdrop-blur-md rounded-full shadow-[0_4px_24px_rgba(0,0,0,0.14)] border border-neutral/15 text-neutral transition-all select-none"
        role="region"
        aria-label="Control de desplazamiento horizontal"
      >
        {/* Left Arrow Button */}
        <button
          type="button"
          onClick={() => handleStep('left')}
          disabled={isAtStart}
          aria-label="Desplazar tabla a la izquierda"
          className="p-1 rounded-full text-neutral/70 hover:text-neutral hover:bg-neutral/10 disabled:opacity-20 disabled:hover:bg-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Scroll Track & Draggable Thumb */}
        <div
          ref={trackRef}
          onClick={handleTrackClick}
          className="relative w-36 sm:w-56 md:w-64 h-2.5 bg-neutral/10 hover:bg-neutral/15 rounded-full cursor-pointer transition-colors overflow-hidden mx-1"
          role="scrollbar"
          aria-controls={targetElement.id || undefined}
          aria-valuenow={scrollPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            onMouseDown={handleThumbMouseDown}
            onTouchStart={handleThumbTouchStart}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: `${thumbWidth}px`,
              transform: `translateX(${thumbLeft}px)`,
            }}
            className={`absolute top-0 bottom-0 bg-primary hover:bg-primary/90 rounded-full transition-colors cursor-grab active:cursor-grabbing shadow-xs ${
              isDragging ? 'bg-primary/95 scale-y-110' : ''
            }`}
          />
        </div>

        {/* Right Arrow Button */}
        <button
          type="button"
          onClick={() => handleStep('right')}
          disabled={isAtEnd}
          aria-label="Desplazar tabla a la derecha"
          className="p-1 rounded-full text-neutral/70 hover:text-neutral hover:bg-neutral/10 disabled:opacity-20 disabled:hover:bg-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Percentage Indicator */}
        <span className="text-[10px] font-semibold text-neutral/50 font-mono min-w-[2rem] text-right">
          {scrollPercentage}%
        </span>
      </div>
    </div>
  );
};

export const FloatingTableScrollbar: React.FC<FloatingTableScrollbarProps> = ({
  targetRef,
  children,
  className = '',
  containerClassName = '',
}) => {
  const internalRef = useRef<HTMLDivElement>(null);
  const [mountedElement, setMountedElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const el = targetRef ? targetRef.current : internalRef.current;
    if (el !== mountedElement) {
      setMountedElement(el);
    }
  }, [targetRef, mountedElement]);

  // Wrapper mode: wraps children in scrollable container
  if (children) {
    return (
      <div className={`relative w-full ${containerClassName}`}>
        <div
          ref={internalRef}
          className={`overflow-x-auto no-scrollbar w-full ${className}`}
        >
          {children}
        </div>
        {mountedElement && <FloatingScrollbarControls targetElement={mountedElement} />}
      </div>
    );
  }

  // Standalone mode: target element supplied via targetRef
  if (!mountedElement) {
    return null;
  }

  return <FloatingScrollbarControls targetElement={mountedElement} />;
};

export default FloatingTableScrollbar;
