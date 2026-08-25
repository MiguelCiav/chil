import React, { useRef, useLayoutEffect, useState } from 'react';
import { X } from 'lucide-react';
import { WalkthroughStep, WalkthroughPlacement } from './types';

export interface WalkthroughDialogProps {
  step: WalkthroughStep;
  stepIndex: number;
  totalSteps: number;
  targetRect: DOMRect | null;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onClose: () => void;
  onPositionChange?: (rect: { top: number; left: number; width: number; height: number; placement: WalkthroughPlacement }) => void;
  className?: string;
}

export const WalkthroughDialog: React.FC<WalkthroughDialogProps> = ({
  step,
  stepIndex,
  totalSteps,
  targetRect,
  onNext,
  onPrev,
  onSkip,
  onClose,
  onPositionChange,
  className = ''
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 100, left: 100 });

  const isLastStep = stepIndex === totalSteps - 1;

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;

    const dialogEl = dialogRef.current;
    const dialogWidth = dialogEl ? dialogEl.offsetWidth : 360;
    const dialogHeight = dialogEl ? dialogEl.offsetHeight : 180;
    const padding = 16;
    const margin = 12;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (!targetRect) {
      const top = Math.max(padding, (vh - dialogHeight) / 2);
      const left = Math.max(padding, (vw - dialogWidth) / 2);
      setPosition({ top, left });
      onPositionChange?.({ top, left, width: dialogWidth, height: dialogHeight, placement: 'auto' });
      return;
    }

    let chosenPlacement: WalkthroughPlacement = step.placement || 'auto';

    if (chosenPlacement === 'auto') {
      const spaceBelow = vh - targetRect.bottom;
      const spaceAbove = targetRect.top;

      if (spaceBelow >= dialogHeight + margin + padding) {
        chosenPlacement = 'bottom';
      } else if (spaceAbove >= dialogHeight + margin + padding) {
        chosenPlacement = 'top';
      } else {
        const spaceRight = vw - targetRect.right;
        const spaceLeft = targetRect.left;
        if (spaceRight >= dialogWidth + margin + padding) {
          chosenPlacement = 'right';
        } else if (spaceLeft >= dialogWidth + margin + padding) {
          chosenPlacement = 'left';
        } else {
          chosenPlacement = spaceBelow >= spaceAbove ? 'bottom' : 'top';
        }
      }
    }

    let top: number;
    let left: number;

    switch (chosenPlacement) {
      case 'top':
        top = targetRect.top - dialogHeight - margin;
        left = targetRect.left + targetRect.width / 2 - dialogWidth / 2;
        break;
      case 'bottom':
        top = targetRect.bottom + margin;
        left = targetRect.left + targetRect.width / 2 - dialogWidth / 2;
        break;
      case 'left':
        top = targetRect.top + targetRect.height / 2 - dialogHeight / 2;
        left = targetRect.left - dialogWidth - margin;
        break;
      case 'right':
        top = targetRect.top + targetRect.height / 2 - dialogHeight / 2;
        left = targetRect.right + margin;
        break;
      default:
        top = targetRect.bottom + margin;
        left = targetRect.left + targetRect.width / 2 - dialogWidth / 2;
    }

    // Boundary constraints: ensure dialog stays fully inside the viewport
    const clampedTop = Math.max(padding, Math.min(vh - dialogHeight - padding, top));
    const clampedLeft = Math.max(padding, Math.min(vw - dialogWidth - padding, left));

    setPosition({ top: clampedTop, left: clampedLeft });
    onPositionChange?.({
      top: clampedTop,
      left: clampedLeft,
      width: dialogWidth,
      height: dialogHeight,
      placement: chosenPlacement
    });
  }, [targetRect, step, onPositionChange]);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="walkthrough-dialog-title"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`
      }}
      className={`fixed z-50 w-[calc(100vw-32px)] max-w-[380px] bg-white rounded-2xl shadow-2xl border border-primary/20 p-5 font-sans pointer-events-auto transition-all duration-200 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary">
          {step.badge || `Paso ${stepIndex + 1} de ${totalSteps}`}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-neutral/40 hover:text-neutral hover:bg-gray-100 rounded-lg transition-colors focus:outline-none"
          aria-label="Cerrar guía"
          title="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Step Title */}
      <h3 id="walkthrough-dialog-title" className="text-base font-bold text-neutral tracking-tight">
        {step.title}
      </h3>

      {/* Body Content */}
      <p className="text-sm text-neutral/80 mt-2 leading-relaxed">
        {step.content}
      </p>

      {/* Footer Controls */}
      <div className="flex items-center justify-between pt-4 mt-3 border-t border-gray-100">
        <button
          type="button"
          onClick={onSkip}
          className="text-xs font-medium text-neutral/50 hover:text-neutral transition-colors underline-offset-2 hover:underline focus:outline-none"
        >
          Omitir guía
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrev}
            disabled={stepIndex === 0}
            className="px-3 py-1.5 text-xs font-semibold text-neutral/70 hover:text-neutral hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none rounded-lg transition-colors border border-gray-200 focus:outline-none"
          >
            ◀ Anterior
          </button>
          <button
            type="button"
            onClick={onNext}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
          >
            {isLastStep ? '¡Entendido! 🎉' : 'Siguiente ▶'}
          </button>
        </div>
      </div>
    </div>
  );
};
