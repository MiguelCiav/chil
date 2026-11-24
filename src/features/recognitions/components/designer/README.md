# Recognitions Designer Components

## Overview
Provides the core visual canvas, header toolbar, draggable field nodes, alignment guidelines overlay, format bar, and styling/formatting utilities for the certificate template designer.

## Interface
- `index.ts:*`: Re-exports all exports from `designerUtils`, `DesignerHeader`, `DraggableField`, `CanvasFormatBar`, `DesignerCanvas`, and `./sidebar`.
- `designerUtils.tsx:FIELD_ICONS`: `Record<RecognitionFieldKey, React.ReactNode>` mapping field keys to Lucide icons.
- `designerUtils.tsx:PRESET_COLORS`: Array of 6 preset color `{ label, value }` objects.
- `designerUtils.tsx:getFormatBadgeText`: Formats canvas dimensions and aspect-ratio label into a badge string.
- `designerUtils.tsx:isScoutsPlanarFont`: Returns `true` when `family` is `'scouts-gt-planar-bold'` or `'Scouts GT Planar'`.
- `designerUtils.tsx:roundPercentCoordinate`: Clamps a coordinate to `[min, max]` (default `[0, 100]`) rounded to 1 decimal place.
- `designerUtils.tsx:getFontFamilyStyle`: Maps `font_family` to CSS `font-family` string using `isScoutsPlanarFont`.
- `designerUtils.tsx:getAlignTransform`: Maps `align` (`'left' | 'right' | 'center'`) to CSS `translate` transform string.
- `designerUtils.tsx:getFieldDisplayText`: Returns preview text (`recognitionName` or `MOCK_CERTIFICATE_DATA`) or bracketed field label.
- `CanvasFormatBar.tsx:CanvasFormatBarProps`: Props interface for `CanvasFormatBar`.
- `CanvasFormatBar.tsx:CanvasFormatBar`: `React.FC` displaying format badge, orientation label, and positioned field count.
- `GuidelinesOverlay.tsx:GuidelinesOverlayProps`: Props interface for `GuidelinesOverlay`.
- `GuidelinesOverlay.tsx:GuidelinesOverlay`: `React.memo` component (`displayName = 'GuidelinesOverlay'`) rendering horizontal/vertical snap guide lines.
- `DraggableField.tsx:DraggableFieldProps`: Props interface for `DraggableField` (including optional `isDragging`, `onNudgeField`, and `onUpdateFieldCoordinates`).
- `DraggableField.tsx:DraggableField`: `React.memo` component (`displayName = 'DraggableField'`) rendering a positioned field (static `div` in preview mode, interactive `button` with `touch-none`, pointer drag, and keyboard nudging in edit mode).
- `DesignerCanvas.tsx:GuidelinesOverlay`: Re-exported component from `./GuidelinesOverlay`.
- `DesignerCanvas.tsx:GuidelinesOverlayProps`: Re-exported type from `./GuidelinesOverlay`.
- `DesignerCanvas.tsx:DesignerCanvasProps`: Props interface for `DesignerCanvas` (including optional `draggingFieldId`, `activeGuides`, `recognitionName`, `onDeselectField`, `onUpdateFieldCoordinates`, and `onNudgeField`).
- `DesignerCanvas.tsx:DesignerCanvas`: `React.FC` rendering the aspect-ratio canvas, custom/default background, `DraggableField` items, `GuidelinesOverlay`, and `CanvasFormatBar`.
- `DesignerHeader.tsx:DesignerHeaderProps`: Props interface for `DesignerHeader` (including optional `isSnapEnabled` and `onToggleSnap`).
- `DesignerHeader.tsx:DesignerHeader`: `React.FC` rendering back button, title, optional walkthrough button, undo/redo, optional snap-to-guides toggle, preview toggle, background upload, and save controls.
- Subdirectories:
  - [`./sidebar/README.md`](./sidebar/README.md) — Three-tab designer sidebar (`DesignerSidebar`, `FieldPaletteTab`, `FieldPropertiesTab`, `BackgroundFormatTab`).

## Invariants
- `designerUtils.tsx:getFormatBadgeText`: Returns `'Formato: 297 × 210 mm'` when `hasCustomBackground` is falsy; falls back to `297 / 210` if dimensions/aspectRatio are missing; matches standard ratios within `0.04` tolerance and falls back to `${Math.round(ratio * 100) / 100}:1`, formatting custom badges as `Formato: ${width} × ${height} (${ratioLabel})`.
- `designerUtils.tsx:getFontFamilyStyle`: Defaults unknown `font_family` values to `'"Noto Sans", sans-serif'`.
- `designerUtils.tsx:getAlignTransform`: Defaults `align` to `'center'` (`'translate(-50%, -50%)'`).
- `designerUtils.tsx:getFieldDisplayText`: Falls back to `field.label` if `MOCK_CERTIFICATE_DATA[field.field_key]` is falsy in preview mode.
- `CanvasFormatBar.tsx:CanvasFormatBar`: Displays `'Orientación Vertical'` when `orientation === 'portrait'` and `'Orientación Horizontal'` otherwise.
- `GuidelinesOverlay.tsx:GuidelinesOverlay`: Memoized with `React.memo`; returns `null` when `isPreviewMode` is true or `activeGuides` is empty.
- `DraggableField.tsx:DraggableField`: Memoized with `React.memo`; clamps `displayFontSizePx` to `>= 8`; renders a non-interactive `div` with `0px` padding in `isPreviewMode`; in edit mode uses `touch-none` and `transition-none` during `isDragging` (`transition-colors` otherwise, never transitioning `left`/`top`/`transform`), nudges with Arrow keys by `0.5` (or `2.5` with Shift) clamped to `[2, 98]` rounded to 1 decimal, selects on Enter/Space, and forces `fontWeight = 700` for `'scouts-gt-planar-bold'` / `'Scouts GT Planar'`.
- `DesignerCanvas.tsx:DesignerCanvas`: Defaults `page_width` to `297` and `page_height` to `210` for `formatBadgeText` and `aspectRatio`; invokes `onDeselectField` on canvas `onPointerDown` when `!isPreviewMode`; forces `isSelected` and `isDragging` to `false` and hides `GuidelinesOverlay` when `isPreviewMode` is true.
- `DesignerHeader.tsx:DesignerHeader`: Defaults `canUndo` and `canRedo` to `false` and `isSnapEnabled` to `true`; disables undo/redo when `!canUndo` / `!canRedo`, snap toggle when `isPreviewMode`, upload when `isUploadingBg` (`'Procesando...'` / `'Cambiar Fondo'` / `'Subir Fondo'`), and save when `isSaving` (`'Guardando...'` vs `'Guardar Plantilla'`); renders snap toggle only when `onToggleSnap` is provided and `WalkthroughHelpButton` only when `onStartTour` is provided.

## Side Effects
- None.

## Verification
- Run: `npm test -- --run`
