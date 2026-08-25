import React, { useRef, useCallback } from 'react';
import { RecognitionFieldConfig } from '../types';

export interface UseCanvasDragOptions {
  canvasRef: React.RefObject<HTMLDivElement | null>;
  fields: RecognitionFieldConfig[];
  isPreviewMode: boolean;
  onUpdateFieldCoordinates: (fieldId: string, x: number, y: number) => void;
  onSelectField?: (fieldId: string) => void;
}

export function useCanvasDrag({
  canvasRef,
  fields,
  isPreviewMode,
  onUpdateFieldCoordinates,
  onSelectField
}: UseCanvasDragOptions) {
  const dragInfoRef = useRef<{
    isDragging: boolean;
    fieldId: string;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
  } | null>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, fieldId: string) => {
      if (isPreviewMode) return;
      e.stopPropagation();
      e.preventDefault();

      const target = e.currentTarget;
      try {
        target.setPointerCapture(e.pointerId);
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

      const { fieldId, startX, startY, initialX, initialY } = dragInfoRef.current;
      const canvasRect = canvasRef.current.getBoundingClientRect();

      if (canvasRect.width === 0 || canvasRect.height === 0) return;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      const percentDeltaX = (deltaX / canvasRect.width) * 100;
      const percentDeltaY = (deltaY / canvasRect.height) * 100;

      let newX = Math.round((initialX + percentDeltaX) * 10) / 10;
      let newY = Math.round((initialY + percentDeltaY) * 10) / 10;

      // Clamp coordinates inside canvas boundaries (2% to 98%)
      newX = Math.max(2, Math.min(98, newX));
      newY = Math.max(2, Math.min(98, newY));

      onUpdateFieldCoordinates(fieldId, newX, newY);
    },
    [canvasRef, onUpdateFieldCoordinates]
  );

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (dragInfoRef.current?.isDragging) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Safe fallback
      }
      dragInfoRef.current = null;
    }
  }, []);

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp
  };
}
