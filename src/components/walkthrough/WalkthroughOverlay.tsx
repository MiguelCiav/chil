import React, { useState } from 'react';
import { WalkthroughStep, WalkthroughPlacement } from './types';
import { WalkthroughDialog } from './WalkthroughDialog';

export interface WalkthroughOverlayProps {
  isOpen: boolean;
  currentStep: WalkthroughStep | null;
  currentStepIndex: number;
  totalSteps: number;
  targetRect: DOMRect | null;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onClose?: () => void;
  className?: string;
}

interface DialogBox {
  top: number;
  left: number;
  width: number;
  height: number;
  placement: WalkthroughPlacement;
}

export const WalkthroughOverlay: React.FC<WalkthroughOverlayProps> = ({
  isOpen,
  currentStep,
  currentStepIndex,
  totalSteps,
  targetRect,
  onNext,
  onPrev,
  onSkip,
  onClose,
  className = ''
}) => {
  const [dialogBox, setDialogBox] = useState<DialogBox | null>(null);

  if (!isOpen || !currentStep) {
    return null;
  }

  const handleClose = onClose || onSkip;
  const padding = 6;

  // Calculate connector line coordinates
  let connector: { targetX: number; targetY: number; dialogX: number; dialogY: number } | null = null;

  if (targetRect && dialogBox) {
    const targetCenterX = targetRect.left + targetRect.width / 2;
    const targetCenterY = targetRect.top + targetRect.height / 2;
    const dialogRight = dialogBox.left + dialogBox.width;
    const dialogBottom = dialogBox.top + dialogBox.height;

    if (dialogBox.top >= targetRect.bottom) {
      // Dialog is below target
      connector = {
        targetX: targetCenterX,
        targetY: targetRect.bottom + padding,
        dialogX: Math.max(dialogBox.left + 24, Math.min(dialogRight - 24, targetCenterX)),
        dialogY: dialogBox.top
      };
    } else if (dialogBottom <= targetRect.top) {
      // Dialog is above target
      connector = {
        targetX: targetCenterX,
        targetY: targetRect.top - padding,
        dialogX: Math.max(dialogBox.left + 24, Math.min(dialogRight - 24, targetCenterX)),
        dialogY: dialogBottom
      };
    } else if (dialogBox.left >= targetRect.right) {
      // Dialog is to the right
      connector = {
        targetX: targetRect.right + padding,
        targetY: targetCenterY,
        dialogX: dialogBox.left,
        dialogY: Math.max(dialogBox.top + 24, Math.min(dialogBottom - 24, targetCenterY))
      };
    } else if (dialogRight <= targetRect.left) {
      // Dialog is to the left
      connector = {
        targetX: targetRect.left - padding,
        targetY: targetCenterY,
        dialogX: dialogRight,
        dialogY: Math.max(dialogBox.top + 24, Math.min(dialogBottom - 24, targetCenterY))
      };
    } else {
      connector = {
        targetX: targetCenterX,
        targetY: targetCenterY,
        dialogX: dialogBox.left + dialogBox.width / 2,
        dialogY: dialogBox.top + dialogBox.height / 2
      };
    }
  }

  return (
    <div
      data-testid="walkthrough-overlay"
      className={`fixed inset-0 z-50 pointer-events-auto select-none font-sans overflow-hidden ${className}`}
    >
      {/* SVG Mask Backdrop */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        aria-hidden="true"
      >
        <defs>
          <mask id="walkthrough-spotlight-mask">
            {/* White base fills everything */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Black cutout over target spotlight */}
            {targetRect && (
              <rect
                x={targetRect.left - padding}
                y={targetRect.top - padding}
                width={targetRect.width + padding * 2}
                height={targetRect.height + padding * 2}
                rx="12"
                ry="12"
                fill="black"
              />
            )}
          </mask>
        </defs>

        {/* Dark backdrop rect with cut-out mask */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(15, 23, 42, 0.75)"
          mask="url(#walkthrough-spotlight-mask)"
        />

        {/* Dynamic SVG Connector Line and Target Anchor Dot */}
        {connector && (
          <g className="transition-all duration-200">
            {/* Dot marker on the target element */}
            <circle
              cx={connector.targetX}
              cy={connector.targetY}
              r="4.5"
              className="fill-primary stroke-white"
              strokeWidth="2"
            />
            {/* Dashed connector line */}
            <line
              x1={connector.targetX}
              y1={connector.targetY}
              x2={connector.dialogX}
              y2={connector.dialogY}
              stroke="#8C4E37"
              strokeWidth="2"
              strokeDasharray="4 3"
              strokeOpacity="0.85"
            />
          </g>
        )}
      </svg>

      {/* Target Element Highlight Box */}
      {targetRect && (
        <div
          data-testid="walkthrough-highlight-box"
          style={{
            top: `${targetRect.top - padding}px`,
            left: `${targetRect.left - padding}px`,
            width: `${targetRect.width + padding * 2}px`,
            height: `${targetRect.height + padding * 2}px`
          }}
          className="absolute pointer-events-none border-2 border-primary ring-4 ring-primary/30 rounded-xl transition-all duration-300 animate-pulse"
        />
      )}

      {/* Dialog Component */}
      <WalkthroughDialog
        step={currentStep}
        stepIndex={currentStepIndex}
        totalSteps={totalSteps}
        targetRect={targetRect}
        onNext={onNext}
        onPrev={onPrev}
        onSkip={onSkip}
        onClose={handleClose}
        onPositionChange={setDialogBox}
      />
    </div>
  );
};
