import React from 'react';
import { Move } from 'lucide-react';
import { RecognitionFieldConfig } from '../../types';
import {
  getFontFamilyStyle,
  getAlignTransform,
  isScoutsPlanarFont,
  roundPercentCoordinate
} from './designerUtils';

export interface DraggableFieldProps {
  field: RecognitionFieldConfig;
  isSelected: boolean;
  isDragging?: boolean;
  isPreviewMode: boolean;
  fontScale: number;
  displayText: string;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>, fieldId: string) => void;
  onSelect: (fieldId: string) => void;
  onNudgeField?: (fieldId: string, deltaX: number, deltaY: number) => void;
  onUpdateFieldCoordinates?: (fieldId: string, x: number, y: number) => void;
}

function getFieldClass(isPreviewMode: boolean, isSelected: boolean, isDragging: boolean): string {
  if (isPreviewMode) {
    return 'cursor-default';
  }
  if (isDragging) {
    return 'z-30 ring-2 ring-primary ring-offset-2 ring-offset-white bg-primary/15 rounded cursor-grabbing transition-none';
  }
  if (isSelected) {
    return 'z-20 ring-2 ring-primary ring-offset-2 ring-offset-white bg-primary/10 rounded cursor-grab active:cursor-grabbing transition-colors';
  }
  return 'z-10 hover:ring-1 hover:ring-primary/50 hover:bg-primary/5 rounded cursor-grab active:cursor-grabbing transition-colors';
}

function getFieldFontWeight(fontWeight?: string, fontFamily?: string): number {
  if (isScoutsPlanarFont(fontFamily)) {
    return 700;
  }
  return fontWeight === 'bold' ? 700 : 400;
}

function getFieldFontStyle(fontWeight?: string): 'italic' | 'normal' {
  return fontWeight === 'italic' ? 'italic' : 'normal';
}

export const DraggableField: React.FC<DraggableFieldProps> = React.memo(
  ({
    field,
    isSelected,
    isDragging = false,
    isPreviewMode,
    fontScale,
    displayText,
    onPointerDown,
    onSelect,
    onNudgeField,
    onUpdateFieldCoordinates
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
            fontWeight: getFieldFontWeight(field.font_weight, field.font_family),
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
            return;
          }

          const step = e.shiftKey ? 2.5 : 0.5;
          let deltaX = 0;
          let deltaY = 0;

          if (e.key === 'ArrowLeft') {
            deltaX = -step;
          } else if (e.key === 'ArrowRight') {
            deltaX = step;
          } else if (e.key === 'ArrowUp') {
            deltaY = -step;
          } else if (e.key === 'ArrowDown') {
            deltaY = step;
          } else {
            return;
          }

          e.preventDefault();
          e.stopPropagation();

          if (!isSelected) {
            onSelect(field.id);
          }

          const nextX = roundPercentCoordinate(field.x + deltaX, 2, 98);
          const nextY = roundPercentCoordinate(field.y + deltaY, 2, 98);

          if (onNudgeField) {
            onNudgeField(field.id, deltaX, deltaY);
          }
          if (onUpdateFieldCoordinates) {
            onUpdateFieldCoordinates(field.id, nextX, nextY);
          }
        }}
        className={`absolute select-none touch-none border-0 outline-hidden ${getFieldClass(false, isSelected, isDragging)}`}
        style={{
          left: `${field.x}%`,
          top: `${field.y}%`,
          transform: getAlignTransform(field.align),
          fontFamily: getFontFamilyStyle(field.font_family),
          fontSize: `${displayFontSizePx}px`,
          fontWeight: getFieldFontWeight(field.font_weight, field.font_family),
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
          <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap flex items-center gap-1 pointer-events-none">
            <Move className="w-2.5 h-2.5" />
            <span>
              {field.label} ({field.x}%, {field.y}%)
            </span>
          </span>
        )}

        {displayText}
      </button>
    );
  }
);

DraggableField.displayName = 'DraggableField';
