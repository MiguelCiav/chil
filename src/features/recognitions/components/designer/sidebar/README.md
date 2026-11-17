# Recognitions Designer Sidebar

## Overview
Implements the right-hand sidebar of the certificate designer, providing a three-tab switcher for adding/removing template fields, editing selected field typography and coordinates, and viewing/managing background format settings.

## Interface
- `index.ts:*`: Re-exports all symbols from `FieldPaletteTab`, `FieldPropertiesTab`, `BackgroundFormatTab`, and `DesignerSidebar`.
- `DesignerSidebar.tsx:DesignerSidebarProps`: Props interface for `DesignerSidebar`.
- `DesignerSidebar.tsx:DesignerSidebar`: `React.FC` rendering the 3-tab switcher (`'palette' | 'properties' | 'format'`) and the active sidebar panel.
- `FieldPaletteTab.tsx:FieldPaletteTabProps`: Props interface for `FieldPaletteTab`.
- `FieldPaletteTab.tsx:FieldPaletteTab`: `React.FC` listing `AVAILABLE_TEMPLATE_FIELDS` with add, select, remove, add-all, and reset actions.
- `FieldPropertiesTab.tsx:FieldPropertiesTabProps`: Props interface for `FieldPropertiesTab`.
- `FieldPropertiesTab.tsx:FieldPropertiesTab`: `React.FC` rendering typography, color, alignment, X/Y coordinate, and delete controls for `selectedField`.
- `BackgroundFormatTab.tsx:BackgroundFormatTabProps`: Props interface for `BackgroundFormatTab`.
- `BackgroundFormatTab.tsx:BackgroundFormatTab`: `React.FC` displaying template dimensions, aspect ratio, orientation, field count, and custom background controls.

## Invariants
- `DesignerSidebar.tsx:DesignerSidebar`: Conditionally renders only the panel matching `activeTab`; selecting a placed field in `FieldPaletteTab` switches `activeTab` to `'properties'`, and closing `FieldPropertiesTab` clears selection (`null`) and switches `activeTab` to `'palette'`.
- `FieldPaletteTab.tsx:FieldPaletteTab`: Conditionally renders `"Añadir todos los campos"` only when `fields.length < AVAILABLE_TEMPLATE_FIELDS.length`; the remove button calls `e.stopPropagation()` before `onRemoveField`.
- `FieldPropertiesTab.tsx:FieldPropertiesTab`: Conditionally renders editor controls only when `selectedField` is non-null (otherwise shows an empty state); font size range input enforces `min={10}`, `max={48}` and parses with `Number.parseInt(..., 10)`; X/Y inputs enforce `min={0}`, `max={100}`, `step={0.1}`, ignore non-finite values, clamp and round to 1 decimal place, and include quick-center buttons (`x: 50`, `y: 50`); font family defaults any value other than `'scouts-gt-planar-bold'` or `'Scouts GT Planar'` to `'noto-sans'`.
- `BackgroundFormatTab.tsx:BackgroundFormatTab`: Falls back aspect ratio display to `(template.page_width / template.page_height).toFixed(3)` when `template.aspect_ratio` is falsy; derives the displayed orientation label (`'Vertical'` / `'Horizontal'`) from `normalizedDimensions.orientation`; conditionally renders thumbnail and `"Cambiar"` (`disabled={isUploadingBg}`, `'Procesando...'` when active) / `"Quitar"` actions when `template.background_url` is set, or the `PNG, JPG, WebP o PDF (página 1)` message and upload button (`disabled={isUploadingBg}`, `'Procesando...'` when active) otherwise.

## Side Effects
- None.

## Verification
- Run: `npm test -- --run`
