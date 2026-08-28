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

function getFieldClass(isPreviewMode: boolean, isSelected: boolean): string {
  if (isPreviewMode) {
    return 'cursor-default';
  }
  if (isSelected) {
    return 'ring-2 ring-primary ring-offset-2 ring-offset-white bg-primary/10 rounded cursor-grab active:cursor-grabbing shadow-lg';
  }
  return 'hover:ring-1 hover:ring-primary/50 hover:bg-primary/5 rounded cursor-pointer';
}

function getFieldFontWeight(fontWeight?: string): number {
  return fontWeight === 'bold' ? 700 : 400;
}

function getFieldFontStyle(fontWeight?: string): 'italic' | 'normal' {
  return fontWeight === 'italic' ? 'italic' : 'normal';
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

  const fieldTitle = isPreviewMode ? undefined : `${field.label} (${field.x}%, ${field.y}%)`;
  const fieldPadding = isPreviewMode ? '0px' : '2px 6px';

  if (isPreviewMode) {
    return (
      <div
        className="absolute z-10 select-none cursor-default"
        style={{
          left: `${field.x}%`,
          top: `${field.y}%`,
          transform: getAlignTransform(field.align),
          fontFamily: getFontFamilyStyle(field.font_family),
          fontSize: `${displayFontSizePx}px`,
          fontWeight: getFieldFontWeight(field.font_weight),
          fontStyle: getFieldFontStyle(field.font_weight),
          color: field.color,
          textAlign: field.align,
          padding: fieldPadding,
          whiteSpace: 'nowrap'
        }}
      >
        {displayText}
      </div>
    );
  }

  return (
    <button
      type="button"
      tabIndex={0}
      aria-label={field.label}
      aria-pressed={isSelected}
      onPointerDown={(e) => onPointerDown(e as unknown as React.PointerEvent<HTMLDivElement>, field.id)}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(field.id);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(field.id);
        }
      }}
      className={`absolute z-10 select-none transition-shadow border-0 outline-hidden ${getFieldClass(false, isSelected)}`}
      style={{
        left: `${field.x}%`,
        top: `${field.y}%`,
        transform: getAlignTransform(field.align),
        fontFamily: getFontFamilyStyle(field.font_family),
        fontSize: `${displayFontSizePx}px`,
        fontWeight: getFieldFontWeight(field.font_weight),
        fontStyle: getFieldFontStyle(field.font_weight),
        color: field.color,
        textAlign: field.align,
        padding: fieldPadding,
        whiteSpace: 'nowrap'
      }}
      title={fieldTitle}
    >
      {/* Floating Position Badge when Selected */}
      {isSelected && (
        <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow whitespace-nowrap flex items-center gap-1 pointer-events-none">
          <Move className="w-2.5 h-2.5" />
          <span>
            {field.label} ({field.x}%, {field.y}%)
          </span>
        </span>
      )}

      {displayText}
    </button>
  );
};
