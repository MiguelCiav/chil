# Recognitions Hooks

## Overview
Provides React hooks and helpers for certificate designer canvas pointer dragging with alignment-aware clamping, DOM-measured WYSIWYG font scaling, and undo/redo template state management.

## Interface
- `index.ts:*`: Re-exports all symbols from `./useCanvasDrag` and `./useCanvasScale` (note: `useDesignerReducer` is imported directly and is not re-exported by `index.ts`).
- `useCanvasDrag.ts:ClampCoordinatesOptions`: Interface configuring `align`, `fieldWidthPercent`, `fieldHeightPercent`, and `minMarginPercent` for clamping.
- `useCanvasDrag.ts:clampFieldCoordinates`: Pure function clamping `(x, y)` percentage coordinates within canvas boundaries with alignment-aware width/height offsets.
- `useCanvasDrag.ts:UseCanvasDragOptions`: Interface configuring `canvasRef`, `fields`, `isPreviewMode`, `onUpdateFieldCoordinates`, optional `onCommitFieldCoordinates`, `onSelectField`, `snapThreshold`, `snapEnabled`, and `dragThresholdPx`.
- `useCanvasDrag.ts:useCanvasDrag`: Hook returning `{ handlePointerDown, handlePointerMove, handlePointerUp, activeGuides, draggingFieldId }` for dragging fields on the canvas.
- `useCanvasScale.ts:computeFontScale`: Pure function computing pixel-to-point font scale factor from `canvasPixelWidth` and `docWidthPt`.
- `useCanvasScale.ts:useCanvasScale`: Hook returning `{ canvasRef, canvasPixelWidth, fontScale, normalizedDimensions }` for 1:1 WYSIWYG scaling.
- `useDesignerReducer.ts:MAX_DESIGNER_HISTORY`: Constant number (`20`) bounding undo history length.
- `useDesignerReducer.ts:buildDefaultField`: Function building a `RecognitionFieldConfig` from a `TemplateFieldDefinition`.
- `useDesignerReducer.ts:buildDefaultTemplateFields`: Function mapping `AVAILABLE_TEMPLATE_FIELDS` to default `RecognitionFieldConfig[]`.
- `useDesignerReducer.ts:normalizeLoadedTemplate`: Function normalizing a partial/nullable `CertificateTemplate` with A4 landscape defaults.
- `useDesignerReducer.ts:getMissingTemplateFields`: Function returning default `RecognitionFieldConfig[]` for `AVAILABLE_TEMPLATE_FIELDS` not present in `currentFields`.
- `useDesignerReducer.ts:DesignerHistoryState`: Interface `{ past: CertificateTemplate[]; present: CertificateTemplate; future: CertificateTemplate[] }`.
- `useDesignerReducer.ts:DesignerAction`: Discriminated union type of 14 designer reducer actions (`LOAD_TEMPLATE`, `SET_TEMPLATE`, `ADD_FIELD`, `ADD_FIELDS`, `REMOVE_FIELD`, `TOGGLE_FIELD`, `UPDATE_FIELD_PROPS`, `MOVE_FIELD_COORDINATES`, `COMMIT_FIELD_MOVE`, `RESET_FIELDS`, `SET_BACKGROUND`, `CLEAR_BACKGROUND`, `UNDO`, `REDO`).
- `useDesignerReducer.ts:createInitialDesignerState`: Function initializing `DesignerHistoryState` with empty `past` and `future`.
- `useDesignerReducer.ts:designerReducer`: Pure reducer handling template mutations and undo/redo history.
- `useDesignerReducer.ts:useDesignerReducer`: Hook wrapping `designerReducer` and returning `{ state, template, past, present, future, canUndo, canRedo, dispatch, loadTemplate, setTemplate, addField, addFields, removeField, toggleField, updateFieldProps, moveFieldCoordinates, moveFieldCoordinatesTransient, commitFieldMove, resetFields, setBackground, clearBackground, undo, redo }`.

## Invariants
- `useCanvasDrag.ts:clampFieldCoordinates`: Defaults `align = 'center'`, `fieldWidthPercent = 0`, `fieldHeightPercent = 0`, `minMarginPercent = 2`; applies alignment-aware width/height bounds only when `fieldWidthPercent` / `fieldHeightPercent` are finite, `> 0`, and `< maxAllowedSpan` (`Math.max(0, 100 - minMarginPercent * 2)`), falling back to `[minMarginPercent, 100 - minMarginPercent]` when oversized so fields never freeze. Adjusts X bounds by `align` (`'left'` -> `[minMargin, 100 - minMargin - w]`, `'right'` -> `[minMargin + w, 100 - minMargin]`, `'center'` -> `[minMargin + w/2, 100 - minMargin - w/2]`) and Y bounds to `[minMargin + h/2, 100 - minMargin - h/2]`. Rounds clamped `x` and `y` to 1 decimal place.
- `useCanvasDrag.ts:useCanvasDrag`: Defaults `snapEnabled = true` and `dragThresholdPx = 3`. When `snapThreshold` is omitted, computes adaptive thresholds from `canvasRect` (`6px` X / `5px` Y clamped to `[0.4%, 0.85%]`). `handlePointerDown` ignores non-primary buttons (`button !== 0`) and `isPreviewMode`, runs `stopPropagation`/`preventDefault`/`focus`/`setPointerCapture` before checking `!field`, and initializes drag on valid fields. `processPointerMove` waits for `dragThresholdPx` before mutating coordinates, deduplicates identical `(clientX, clientY, altKey)` frames, returns early if `canvasRect.width === 0 || canvasRect.height === 0`, skips snapping when `!snapEnabled || altKey`, invokes `calculateSnapGuidelines` without `fieldWidths` (anchor snapping), and commits one move via `onCommitFieldCoordinates` on `endActiveDrag` if `hasMoved`.
- `useCanvasScale.ts:computeFontScale`: Returns `1` if `docWidthPt` is non-finite or `<= 0`, or if the resulting scale is non-finite or `<= 0`; falls back `canvasPixelWidth` to `800` when non-finite or `<= 0`.
- `useCanvasScale.ts:useCanvasScale`: Converts `normalizedDimensions.width` (mm) to points via `* (72 / 25.4)`, treating `template.page_width` as `0` if it is a number that is non-finite or `<= 0`. Only updates `canvasPixelWidth` when measured width `> 0`.
- `useDesignerReducer.ts:MAX_DESIGNER_HISTORY`: Bounds `state.past` to at most `20` entries via `.slice(-MAX_DESIGNER_HISTORY)` in `pushHistory`, `COMMIT_FIELD_MOVE`, and `REDO`.
- `useDesignerReducer.ts:designerReducer`: `LOAD_TEMPLATE` resets `past` and `future` to `[]`. `pushHistory` returns `state` unchanged if `nextPresent === state.present`, otherwise clears `future` to `[]`. `MOVE_FIELD_COORDINATES` skips `pushHistory` when `recordHistory === false`; `COMMIT_FIELD_MOVE` records a single undo entry from `(initialX, initialY)` to `(x, y)` and is a no-op if coordinates did not change or target is missing. `ADD_FIELD`, `ADD_FIELDS`, `REMOVE_FIELD`, `UPDATE_FIELD_PROPS`, `MOVE_FIELD_COORDINATES`, and `TOGGLE_FIELD` (when key is unknown) return `state` unchanged on no-op, duplicate, or missing targets. `CLEAR_BACKGROUND` resets `background_url = ''`, `page_width = 297`, `page_height = 210`, `aspect_ratio = 297 / 210`, `orientation = 'landscape'`. `UNDO` and `REDO` are no-ops when `past` or `future` are empty.
- `useDesignerReducer.ts:normalizeLoadedTemplate`: Defaults `page_width = 297`, `page_height = 210`, `aspect_ratio = page_width / page_height` (or `297 / 210`), `background_url = ''`, `orientation = 'landscape'`, and falls back to `buildDefaultTemplateFields()` when `template` or `template.fields` array is missing.

## Side Effects
- `useCanvasDrag.ts:useCanvasDrag`: Syncs option/callback refs in `useLayoutEffect`; registers and cleans up `window` `'pointermove'`, `'pointerup'`, `'pointercancel'`, `'keydown'`, and `'keyup'` (for `Alt`) listeners in `useEffect`; focuses the field target (`focus({ preventScroll: true })`) and calls `setPointerCapture`/`releasePointerCapture` on target/captured `HTMLElement`s; mutates `dragInfoRef` (`useRef`); reads DOM bounding boxes via `canvasRef.current.getBoundingClientRect()` and `capturedElement.getBoundingClientRect()`.
- `useCanvasScale.ts:useCanvasScale`: Holds `canvasRef` (`useRef`); reads `canvasRef.current.clientWidth`; observes `canvasRef.current` with `ResizeObserver` (falling back to `window` `'resize'` listener if `ResizeObserver` is undefined) and disconnects/removes listener on cleanup.

## Verification
- Run: `npm test -- --run`
