import React, { useRef, useCallback, useState, useEffect, useLayoutEffect } from 'react';
import { RecognitionFieldConfig } from '../types';
import { AlignmentGuide, calculateSnapGuidelines } from '../utils/snapGuidelines';

const DEFAULT_SNAP_RADIUS_X_PX = 6;
const DEFAULT_SNAP_RADIUS_Y_PX = 5;
const MIN_SNAP_PERCENT = 0.4;
const MAX_SNAP_PERCENT = 0.85;
const DEFAULT_DRAG_THRESHOLD_PX = 3;

function computeAdaptiveSnapThreshold(canvasSizePx: number, radiusPx: number): number {
  if (!Number.isFinite(canvasSizePx) || canvasSizePx <= 0) {
    return MAX_SNAP_PERCENT;
  }
  const percent = (radiusPx / canvasSizePx) * 100;
  return Math.max(MIN_SNAP_PERCENT, Math.min(MAX_SNAP_PERCENT, percent));
}

function areGuidesEqual(a: AlignmentGuide[], b: AlignmentGuide[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (
      a[i].orientation !== b[i].orientation ||
      a[i].position !== b[i].position ||
      a[i].type !== b[i].type ||
      a[i].targetFieldId !== b[i].targetFieldId
    ) {
      return false;
    }
  }
  return true;
}

export interface ClampCoordinatesOptions {
  align?: RecognitionFieldConfig['align'];
  fieldWidthPercent?: number;
  fieldHeightPercent?: number;
  minMarginPercent?: number;
}

/**
 * Alignment-aware coordinate clamping within canvas boundaries.
 * Defaults to [2%, 98%] when field dimensions are 0, unavailable, or span >= the inner canvas width/height
 * so oversized labels never freeze horizontal or vertical dragging.
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
  const hasBoundedWidth =
    Number.isFinite(fieldWidthPercent) &&
    fieldWidthPercent > 0 &&
    fieldWidthPercent < maxAllowedSpan;
  const hasBoundedHeight =
    Number.isFinite(fieldHeightPercent) &&
    fieldHeightPercent > 0 &&
    fieldHeightPercent < maxAllowedSpan;

  let minX = minMarginPercent;
  let maxX = 100 - minMarginPercent;

  if (hasBoundedWidth) {
    if (align === 'left') {
      minX = minMarginPercent;
      maxX = 100 - minMarginPercent - fieldWidthPercent;
    } else if (align === 'right') {
      minX = minMarginPercent + fieldWidthPercent;
      maxX = 100 - minMarginPercent;
    } else {
      minX = minMarginPercent + fieldWidthPercent / 2;
      maxX = 100 - minMarginPercent - fieldWidthPercent / 2;
    }
  }

  const effectiveHeight = hasBoundedHeight ? fieldHeightPercent : 0;
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
  onCommitFieldCoordinates?: (
    fieldId: string,
    initialX: number,
    initialY: number,
    finalX: number,
    finalY: number
  ) => void;
  onSelectField?: (fieldId: string) => void;
  snapThreshold?: number; // optional fixed percentage override; defaults to adaptive ~6px/5px radius
  snapEnabled?: boolean; // default: true (can always be bypassed mid-drag with Alt)
  dragThresholdPx?: number; // default: 3px movement before drag starts
}

export function useCanvasDrag({
  canvasRef,
  fields,
  isPreviewMode,
  onUpdateFieldCoordinates,
  onCommitFieldCoordinates,
  onSelectField,
  snapThreshold,
  snapEnabled = true,
  dragThresholdPx = DEFAULT_DRAG_THRESHOLD_PX
}: UseCanvasDragOptions) {
  const [activeGuides, setActiveGuides] = useState<AlignmentGuide[]>([]);
  const [draggingFieldId, setDraggingFieldId] = useState<string | null>(null);

  const fieldsRef = useRef(fields);
  const onUpdateFieldCoordinatesRef = useRef(onUpdateFieldCoordinates);
  const onCommitFieldCoordinatesRef = useRef(onCommitFieldCoordinates);
  const onSelectFieldRef = useRef(onSelectField);
  const snapEnabledRef = useRef(snapEnabled);
  const snapThresholdRef = useRef(snapThreshold);
  const dragThresholdPxRef = useRef(dragThresholdPx);

  useLayoutEffect(() => {
    fieldsRef.current = fields;
    onUpdateFieldCoordinatesRef.current = onUpdateFieldCoordinates;
    onCommitFieldCoordinatesRef.current = onCommitFieldCoordinates;
    onSelectFieldRef.current = onSelectField;
    snapEnabledRef.current = snapEnabled;
    snapThresholdRef.current = snapThreshold;
    dragThresholdPxRef.current = dragThresholdPx;
  });

  const dragInfoRef = useRef<{
    isDragging: boolean;
    hasMoved: boolean;
    fieldId: string;
    pointerId: number;
    capturedElement: HTMLElement | null;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    lastCommittedX: number;
    lastCommittedY: number;
    lastClientX: number;
    lastClientY: number;
    lastAltKey: boolean;
  } | null>(null);

  const processPointerMove = useCallback(
    (clientX: number, clientY: number, altKey: boolean) => {
      const activeDrag = dragInfoRef.current;
      if (!activeDrag?.isDragging || !canvasRef.current) return;

      if (
        activeDrag.hasMoved &&
        activeDrag.lastClientX === clientX &&
        activeDrag.lastClientY === clientY &&
        activeDrag.lastAltKey === altKey
      ) {
        return;
      }

      const { fieldId, capturedElement, startX, startY, initialX, initialY } = activeDrag;

      if (!activeDrag.hasMoved) {
        const distancePx = Math.hypot(clientX - startX, clientY - startY);
        if (distancePx < dragThresholdPxRef.current) {
          return;
        }
        activeDrag.hasMoved = true;
      }

      activeDrag.lastClientX = clientX;
      activeDrag.lastClientY = clientY;
      activeDrag.lastAltKey = altKey;

      const canvasRect = canvasRef.current.getBoundingClientRect();
      if (canvasRect.width === 0 || canvasRect.height === 0) return;

      const currentFields = fieldsRef.current;
      const field = currentFields.find((f) => f.id === fieldId);
      const targetRect = capturedElement?.getBoundingClientRect?.();
      const fieldWidthPercent =
        targetRect && targetRect.width > 0 ? (targetRect.width / canvasRect.width) * 100 : 0;
      const fieldHeightPercent =
        targetRect && targetRect.height > 0 ? (targetRect.height / canvasRect.height) * 100 : 0;

      const deltaX = clientX - startX;
      const deltaY = clientY - startY;

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

      const shouldSnap = snapEnabledRef.current && !altKey;
      let nextCoords = clampedRaw;
      let nextGuides: AlignmentGuide[] = [];

      if (shouldSnap) {
        const thresholdOverride = snapThresholdRef.current;
        const thresholdX =
          thresholdOverride ??
          computeAdaptiveSnapThreshold(canvasRect.width, DEFAULT_SNAP_RADIUS_X_PX);
        const thresholdY =
          thresholdOverride ??
          computeAdaptiveSnapThreshold(canvasRect.height, DEFAULT_SNAP_RADIUS_Y_PX);

        const snapResult = calculateSnapGuidelines({
          currentX: clampedRaw.x,
          currentY: clampedRaw.y,
          fieldId,
          fields: currentFields,
          threshold: thresholdX,
          thresholdX,
          thresholdY
        });

        nextCoords = clampFieldCoordinates(snapResult.snappedX, snapResult.snappedY, {
          align: field?.align,
          fieldWidthPercent,
          fieldHeightPercent
        });
        nextGuides = snapResult.activeGuides;
      }

      activeDrag.lastCommittedX = nextCoords.x;
      activeDrag.lastCommittedY = nextCoords.y;

      setActiveGuides((prev) => (areGuidesEqual(prev, nextGuides) ? prev : nextGuides));
      onUpdateFieldCoordinatesRef.current(fieldId, nextCoords.x, nextCoords.y);
    },
    [canvasRef]
  );

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
    setDraggingFieldId(null);
    setActiveGuides((prev) => (prev.length === 0 ? prev : []));

    if (activeDrag.hasMoved) {
      onCommitFieldCoordinatesRef.current?.(
        activeDrag.fieldId,
        activeDrag.initialX,
        activeDrag.initialY,
        activeDrag.lastCommittedX,
        activeDrag.lastCommittedY
      );
    }
  }, []);

  useEffect(() => {
    const handleWindowPointerMove = (e: PointerEvent) => {
      const activeDrag = dragInfoRef.current;
      if (!activeDrag?.isDragging || e.pointerId !== activeDrag.pointerId) return;
      processPointerMove(e.clientX, e.clientY, e.altKey);
    };

    const handleWindowPointerEnd = (e: PointerEvent) => {
      const activeDrag = dragInfoRef.current;
      if (!activeDrag?.isDragging) return;
      if (e.pointerId !== undefined && e.pointerId !== activeDrag.pointerId) return;
      endActiveDrag(e.pointerId);
    };

    const handleWindowAltToggle = (e: KeyboardEvent) => {
      if (e.key !== 'Alt') return;
      const activeDrag = dragInfoRef.current;
      if (!activeDrag?.isDragging || !activeDrag.hasMoved) return;
      processPointerMove(activeDrag.lastClientX, activeDrag.lastClientY, e.altKey);
    };

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerEnd);
    window.addEventListener('pointercancel', handleWindowPointerEnd);
    window.addEventListener('keydown', handleWindowAltToggle);
    window.addEventListener('keyup', handleWindowAltToggle);

    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerEnd);
      window.removeEventListener('pointercancel', handleWindowPointerEnd);
      window.removeEventListener('keydown', handleWindowAltToggle);
      window.removeEventListener('keyup', handleWindowAltToggle);
    };
  }, [processPointerMove, endActiveDrag]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, fieldId: string) => {
      if (isPreviewMode) return;
      if (typeof e.button === 'number' && e.button !== 0) return;

      e.stopPropagation();
      e.preventDefault();

      const target = e.currentTarget as HTMLElement | null;
      target?.focus?.({ preventScroll: true });

      try {
        target?.setPointerCapture?.(e.pointerId);
      } catch {
        // safe fallback
      }

      const field = fieldsRef.current.find((f) => f.id === fieldId);
      if (!field) return;

      onSelectFieldRef.current?.(fieldId);

      dragInfoRef.current = {
        isDragging: true,
        hasMoved: false,
        fieldId,
        pointerId: e.pointerId,
        capturedElement: target,
        startX: e.clientX,
        startY: e.clientY,
        initialX: field.x,
        initialY: field.y,
        lastCommittedX: field.x,
        lastCommittedY: field.y,
        lastClientX: e.clientX,
        lastClientY: e.clientY,
        lastAltKey: Boolean(e.altKey)
      };
      setDraggingFieldId(fieldId);
    },
    [isPreviewMode]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      processPointerMove(e.clientX, e.clientY, Boolean(e.altKey));
    },
    [processPointerMove]
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
    activeGuides,
    draggingFieldId
  };
}
