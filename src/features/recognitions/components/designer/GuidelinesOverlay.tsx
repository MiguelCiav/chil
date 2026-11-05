import React from 'react';
import { AlignmentGuide } from '../../utils/snapGuidelines';

export interface GuidelinesOverlayProps {
  activeGuides: AlignmentGuide[];
  isPreviewMode?: boolean;
}

export const GuidelinesOverlay: React.FC<GuidelinesOverlayProps> = React.memo(
  ({ activeGuides, isPreviewMode = false }) => {
    if (isPreviewMode || !activeGuides || activeGuides.length === 0) {
      return null;
    }

    return (
      <>
        {activeGuides.map((guide, idx) => {
          const isCenter = guide.type === 'canvas-center';
          const borderClass = isCenter ? 'border-emerald-500' : 'border-emerald-400/80';

          if (guide.orientation === 'horizontal') {
            return (
              <div
                key={`guide-h-${guide.position}-${idx}`}
                data-testid="alignment-guide-horizontal"
                className={`absolute left-0 right-0 border-t border-dashed pointer-events-none z-20 ${borderClass}`}
                style={{ top: `${guide.position}%` }}
              >
                {isCenter && (
                  <span className="absolute right-2 -top-2.5 bg-emerald-600 text-white text-[9px] font-bold px-1 rounded">
                    50%
                  </span>
                )}
              </div>
            );
          }

          return (
            <div
              key={`guide-v-${guide.position}-${idx}`}
              data-testid="alignment-guide-vertical"
              className={`absolute top-0 bottom-0 border-l border-dashed pointer-events-none z-20 ${borderClass}`}
              style={{ left: `${guide.position}%` }}
            >
              {isCenter && (
                <span className="absolute bottom-2 -left-3 bg-emerald-600 text-white text-[9px] font-bold px-1 rounded">
                  50%
                </span>
              )}
            </div>
          );
        })}
      </>
    );
  }
);

GuidelinesOverlay.displayName = 'GuidelinesOverlay';
