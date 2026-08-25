import React from 'react';
import { Layers, Sliders } from 'lucide-react';

export interface CanvasFormatBarProps {
  formatBadgeText: string;
  orientation: 'landscape' | 'portrait';
  fieldCount: number;
}

export const CanvasFormatBar: React.FC<CanvasFormatBarProps> = ({
  formatBadgeText,
  orientation,
  fieldCount
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-3 sm:p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-bold shadow-xs">
          <Layers className="w-3.5 h-3.5" />
          <span>{formatBadgeText}</span>
        </span>

        <span className="text-xs text-neutral/50 hidden sm:inline">
          {orientation === 'portrait' ? 'Orientación Vertical' : 'Orientación Horizontal'}
        </span>
      </div>

      <div className="flex items-center gap-2 text-xs text-neutral/60">
        <span className="inline-flex items-center gap-1 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-lg">
          <Sliders className="w-3.5 h-3.5 text-primary" />
          <span>{fieldCount} campos posicionados</span>
        </span>
      </div>
    </div>
  );
};
