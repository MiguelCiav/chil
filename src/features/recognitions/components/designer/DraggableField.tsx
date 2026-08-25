import React from 'react';
import { Move } from 'lucide-react';
import { RecognitionFieldConfig } from '../../types';
import { getFontFamilyStyle, getAlignTransform } from './designerUtils';

export interface DraggableFieldProps {
  field: RecognitionFieldConfig;
  isSelected: boolean;
  isPreviewMode: boolean;
  fontScale: number;
  displayText: string;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>, fieldId: string) => void;
  onSelect: (fieldId: string) => void;
}

export const DraggableField: React.FC<DraggableFieldProps> = ({
  field,
  isSelected,
  isPreviewMode,
  fontScale,
  displayText,
  onPointerDown,
  onSelect
}) => {
  const displayFontSizePx = Math.max(
    8,
    Math.round(field.font_size * fontScale * 100) / 100
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onPointerDown={(e) => onPointerDown(e, field.id)}
      onClick={(e) => {
        e.stopPropagation();
        if (!isPreviewMode) {
          onSelect(field.id);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (!isPreviewMode) {
            onSelect(field.id);
          }
        }
      }}
      className={`absolute z-10 select-none transition-shadow ${
        isPreviewMode
          ? 'cursor-default'
          : isSelected
          ? 'ring-2 ring-primary ring-offset-2 ring-offset-white bg-primary/10 rounded cursor-grab active:cursor-grabbing shadow-lg'
          : 'hover:ring-1 hover:ring-primary/50 hover:bg-primary/5 rounded cursor-pointer'
      }`}
      style={{
        left: `${field.x}%`,
        top: `${field.y}%`,
        transform: getAlignTransform(field.align),
        fontFamily: getFontFamilyStyle(field.font_family),
        fontSize: `${displayFontSizePx}px`,
        fontWeight: field.font_weight === 'bold' ? 700 : 400,
        fontStyle: field.font_weight === 'italic' ? 'italic' : 'normal',
        color: field.color,
        textAlign: field.align,
        padding: isPreviewMode ? '0px' : '2px 6px',
        whiteSpace: 'nowrap'
      }}
      title={!isPreviewMode ? `${field.label} (${field.x}%, ${field.y}%)` : undefined}
    >
      {/* Floating Position Badge when Selected */}
      {isSelected && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow whitespace-nowrap flex items-center gap-1 pointer-events-none">
          <Move className="w-2.5 h-2.5" />
          <span>
            {field.label} ({field.x}%, {field.y}%)
          </span>
        </div>
      )}

      {displayText}
    </div>
  );
};
