# Recognitions Components

## Overview
Top-level recognition feature components implementing the recognition catalog table with CRUD modals and the full-page certificate template designer.

## Interface
- `CertificateDesigner.tsx:CertificateDesigner`: Named export `React.FC` implementing the certificate template designer page.
- `CertificateDesigner.tsx:default`: Default export of `CertificateDesigner`.
- `RecognitionCatalog.tsx:RecognitionCatalog`: Named export `React.FC` implementing the recognition types catalog with search, pagination, and CRUD modals.
- `RecognitionCatalog.tsx:default`: Default export of `RecognitionCatalog`.
- `RecognitionDeleteModal.tsx:RecognitionDeleteModal`: Named export `React.FC` rendering the delete confirmation modal for a `RecognitionType`.
- `RecognitionFormModal.tsx:RecognitionFormModalProps`: Props interface for `RecognitionFormModal`.
- `RecognitionFormModal.tsx:RecognitionFormModal`: Named export `React.FC` rendering the create/edit modal for a `RecognitionType`.
- Subdirectories:
  - [`./designer/README.md`](./designer/README.md) — Certificate designer canvas, header, draggable fields, alignment guidelines, and [`./designer/sidebar/README.md`](./designer/sidebar/README.md).

## Invariants
- `CertificateDesigner.tsx:CertificateDesigner`: Uses an `isMounted` flag in `loadData` to skip state updates on `!isMounted || !item` (while `catch` error notification is unguarded); initializes a 6-step `useWalkthrough` tour (`'certificate-designer-tour'`, `autoStart: true`, persisted per `user?.uid`); binds `Ctrl/Cmd+Z` (`undo`) and `Ctrl/Cmd+Shift+Z` / `Ctrl/Cmd+Y` (`redo`) while ignoring events inside `INPUT`, `TEXTAREA`, or `contentEditable` elements; manages `isSnapEnabled` (`true` default) and wires transient drag updates (`moveFieldCoordinatesTransient`) with single-entry commit (`commitFieldMove`) into `useCanvasDrag`; `handleAddField` selects an existing field instead of duplicating; `handleAddAllFields` returns early if no missing fields exist; `handleResetFields` resets fields, selects `defaultFields[0].id`, and switches to `'properties'`; `handleRemoveBackground` calls `clearBackground()` and shows a toast; `handleSaveTemplate` guards on `!recognition`; `updateSelectedField` guards on `!selectedFieldId`; clears `toastTimerRef` before scheduling a new toast and on unmount; resets `fileInputRef.current.value = ''` in `finally`; `extractBackgroundTemplatePatch` defaults string results to `297x210` landscape.
- `RecognitionCatalog.tsx:RecognitionCatalog`: Memoizes table columns with `useMemo`; initializes `@tanstack/react-table` with `pageSize: 10`; formats creation dates via `es-ES` `toLocaleDateString` (`'-'` when missing); renders a loading spinner, empty-catalog CTA (`totalCount === 0`), or filtered-empty state with a clear-filter button.
- `RecognitionDeleteModal.tsx:RecognitionDeleteModal`: Returns `null` when `recognition` is `null`; blocks modal close and disables action buttons while `loading` is `true`.
- `RecognitionFormModal.tsx:RecognitionFormModal`: Validates form with `zodResolver(recognitionFormSchema)`; keys `RecognitionFormContent` by open state, `recognition.id`, and `recognition.name` to reset form state; resets form state to `{ name: '' }` after a successful submit; blocks `handleClose` (while passing `onClose` directly to `<Modal>`) and disables inputs/buttons while `loading` is `true`.

## Side Effects
- `CertificateDesigner.tsx:CertificateDesigner`: Calls `getRecognitionTypeById`, `processBackgroundImageFile`, and `saveCertificateTemplate` APIs; initializes `useWalkthrough` persistence; adds/removes a `window` `'keydown'` listener; schedules/clears a `4000ms` `setTimeout` for toasts; navigates via `useNavigate('/reconocimientos')`; logs errors with `console.error`; programmatically clicks the hidden file input via `fileInputRef`.
- `RecognitionCatalog.tsx:RecognitionCatalog`: Calls `getAllRecognitionTypes(user?.uid)` API; navigates via `useNavigate('/reconocimientos/${id}/plantilla')`; schedules an uncleaned `4000ms` `setTimeout` for toasts (`triggerToast`); logs errors with `console.error`.
- `RecognitionDeleteModal.tsx:RecognitionDeleteModal`: Calls `deleteRecognitionType(recognition.id)` API; logs errors with `console.error`.
- `RecognitionFormModal.tsx:RecognitionFormModal`: Calls `createRecognitionType` or `updateRecognitionType` APIs; logs errors with `console.error`.

## Verification
- Run: `npm test -- --run`
