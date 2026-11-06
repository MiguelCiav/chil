import React, { useRef, useCallback, useState, useEffect } from 'react';
import { RecognitionFieldConfig } from '../types';
import { AlignmentGuide, calculateSnapGuidelines } from '../utils/snapGuidelines';

export interface ClampCoordinatesOptions {
  align?: RecognitionFieldConfig['align'];
  fieldWidthPercent?: number;
  fieldHeightPercent?: number;
  minMarginPercent?: number;
}

/**
 * Alignment-aware coordinate clamping within canvas boundaries.
 * Defaults to [2%, 98%] when field dimensions are 0 or unavailable,
 * and accounts for text alignment ('left' | 'center' | 'right') when width/height > 0.
 */
export function clampFieldCoordinates(
  x: number,
  y: number,
  options: ClampCoordinatesOptions = {}
): { x: number; y: number } {
  const {
    align = 'center',
    fieldWidthPercent = 0,
    fieldHeightPercent = 0,
    minMarginPercent = 2
  } = options;

  const maxAllowedSpan = Math.max(0, 100 - minMarginPercent * 2);
  const effectiveWidth =
    Number.isFinite(fieldWidthPercent) && fieldWidthPercent > 0
      ? Math.min(fieldWidthPercent, maxAllowedSpan)
      : 0;
  const effectiveHeight =
    Number.isFinite(fieldHeightPercent) && fieldHeightPercent > 0
      ? Math.min(fieldHeightPercent, maxAllowedSpan)
      : 0;

  let minX = minMarginPercent;
  let maxX = 100 - minMarginPercent;

  if (effectiveWidth > 0) {
    if (align === 'left') {
      minX = minMarginPercent;
      maxX = 100 - minMarginPercent - effectiveWidth;
    } else if (align === 'right') {
      minX = minMarginPercent + effectiveWidth;
      maxX = 100 - minMarginPercent;
    } else {
      minX = minMarginPercent + effectiveWidth / 2;
      maxX = 100 - minMarginPercent - effectiveWidth / 2;
    }
  }

  const minY = minMarginPercent + effectiveHeight / 2;
  const maxY = 100 - minMarginPercent - effectiveHeight / 2;

  const clampedX = Math.max(minX, Math.min(maxX, x));
  const clampedY = Math.max(minY, Math.min(maxY, y));

  return {
    x: Math.round(clampedX * 10) / 10,
    y: Math.round(clampedY * 10) / 10
  };
}

export interface UseCanvasDragOptions {
  canvasRef: React.RefObject<HTMLDivElement | null>;
  fields: RecognitionFieldConfig[];
  isPreviewMode: boolean;
  onUpdateFieldCoordinates: (fieldId: string, x: number, y: number) => void;
  onSelectField?: (fieldId: string) => void;
  snapThreshold?: number; // threshold in percentage, default 1.5%
}

export function useCanvasDrag({
  canvasRef,
  fields,
  isPreviewMode,
  onUpdateFieldCoordinates,
  onSelectField,
  snapThreshold = 1.5
}: UseCanvasDragOptions) {
  const [activeGuides, setActiveGuides] = useState<AlignmentGuide[]>([]);

  const dragInfoRef = useRef<{
    isDragging: boolean;
    fieldId: string;
    pointerId: number;
    capturedElement: HTMLElement | null;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
  } | null>(null);

  const endActiveDrag = useCallback((pointerId?: number, eventTarget?: HTMLElement | null) => {
    const activeDrag = dragInfoRef.current;
    if (!activeDrag?.isDragging) return;

    const pid = pointerId ?? activeDrag.pointerId;
    const capturedEl = activeDrag.capturedElement;

    if (capturedEl && typeof capturedEl.releasePointerCapture === 'function') {
      try {
        capturedEl.releasePointerCapture(pid);
      } catch {
        // Safe fallback if pointer capture was already released
      }
    }

    if (
      eventTarget &&
      eventTarget !== capturedEl &&
      typeof eventTarget.releasePointerCapture === 'function'
    ) {
      try {
        eventTarget.releasePointerCapture(pid);
      } catch {
        // Safe fallback
      }
    }

    dragInfoRef.current = null;
    setActiveGuides([]);
  }, []);

  useEffect(() => {
    const handleWindowPointerEnd = (e: PointerEvent) => {
      if (dragInfoRef.current?.isDragging) {
        endActiveDrag(e.pointerId);
      }
    };

    window.addEventListener('pointerup', handleWindowPointerEnd);
    window.addEventListener('pointercancel', handleWindowPointerEnd);
    return () => {
      window.removeEventListener('pointerup', handleWindowPointerEnd);
      window.removeEventListener('pointercancel', handleWindowPointerEnd);
    };
  }, [endActiveDrag]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, fieldId: string) => {
      if (isPreviewMode) return;
      e.stopPropagation();
      e.preventDefault();

      const target = e.currentTarget as HTMLElement | null;
      try {
        target?.setPointerCapture?.(e.pointerId);
      } catch {
        // safe fallback
      }

      const field = fields.find((f) => f.id === fieldId);
      if (!field) return;

      if (onSelectField) {
        onSelectField(fieldId);
      }

      dragInfoRef.current = {
        isDragging: true,
        fieldId,
        pointerId: e.pointerId,
        capturedElement: target,
        startX: e.clientX,
        startY: e.clientY,
        initialX: field.x,
        initialY: field.y
      };
    },
    [isPreviewMode, fields, onSelectField]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragInfoRef.current?.isDragging || !canvasRef.current) return;

      const { fieldId, capturedElement, startX, startY, initialX, initialY } = dragInfoRef.current;
      const canvasRect = canvasRef.current.getBoundingClientRect();

      if (canvasRect.width === 0 || canvasRect.height === 0) return;

      const field = fields.find((f) => f.id === fieldId);
      const targetRect = capturedElement?.getBoundingClientRect?.();
      const fieldWidthPercent =
        targetRect && targetRect.width > 0 ? (targetRect.width / canvasRect.width) * 100 : 0;
      const fieldHeightPercent =
        targetRect && targetRect.height > 0 ? (targetRect.height / canvasRect.height) * 100 : 0;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      const percentDeltaX = (deltaX / canvasRect.width) * 100;
      const percentDeltaY = (deltaY / canvasRect.height) * 100;

      const rawX = Math.round((initialX + percentDeltaX) * 10) / 10;
      const rawY = Math.round((initialY + percentDeltaY) * 10) / 10;

      // Alignment-aware clamping inside canvas boundaries
      const clampedRaw = clampFieldCoordinates(rawX, rawY, {
        align: field?.align,
        fieldWidthPercent,
        fieldHeightPercent
      });

      // Calculate snapping and active guidelines
      const snapResult = calculateSnapGuidelines({
        currentX: clampedRaw.x,
        currentY: clampedRaw.y,
        fieldId,
        fields,
        threshold: snapThreshold
      });

      const finalClamped = clampFieldCoordinates(snapResult.snappedX, snapResult.snappedY, {
        align: field?.align,
        fieldWidthPercent,
        fieldHeightPercent
      });

      setActiveGuides(snapResult.activeGuides);
      onUpdateFieldCoordinates(fieldId, finalClamped.x, finalClamped.y);
    },
    [canvasRef, fields, onUpdateFieldCoordinates, snapThreshold]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      endActiveDrag(e.pointerId, e.currentTarget as HTMLElement | null);
    },
    [endActiveDrag]
  );

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    activeGuides
  };
}
