# Shared Batch Components

## Overview
Reusable modal dialogs and member cell helpers shared across batch list, batch detail, and batch wizard workflows for certificate ZIP progress/cancellation, deleting batches, editing existing members, and adding manual or non-scout members.

## Interface
- `index.ts: *` (re-exports `./CertificateZipProgressModal`, `./DeleteBatchModal`, `./EditMemberModal`, `./ManualMemberModal`, `./ScraperAlertModals`, `./memberColumns`)
- `CertificateZipProgressModal.tsx:CertificateZipProgressModal`, `CertificateZipProgressModal.tsx:CertificateZipProgressModalProps`
- `DeleteBatchModal.tsx:DeleteBatchModal`, `DeleteBatchModal.tsx:DeleteBatchModalProps`
- `EditMemberModal.tsx:EditMemberModal`, `EditMemberModal.tsx:EditMemberModalProps`, `EditMemberModal.tsx:EditMemberLifecycle`
- `ManualMemberModal.tsx:ManualMemberModal`, `ManualMemberModal.tsx:ManualMemberModalProps`
- `ScraperAlertModals.tsx:ScraperAlertModals`, `ScraperAlertModals.tsx:ScraperAlertModalsProps`
- `memberColumns.tsx:renderMemberIdentityCell`, `memberColumns.tsx:renderMemberNameCell`, `memberColumns.tsx:renderMemberUnitCell`, `memberColumns.tsx:renderMemberTypeCell`, `memberColumns.tsx:renderMemberStatusCell`, `memberColumns.tsx:renderMemberCodeCell`

## Invariants
- `CertificateZipProgressModal.tsx:CertificateZipProgressModal` blocks backdrop closing (`onClose={() => {}}`), displays optional `scopeLabel`, switches status text between `'Preparando lote...'`, `'Generando PDFs individuales...'`, `'Comprimiendo archivo ZIP...'`, and `'Cancelando...'` (when `isCancelling || phase === 'cancelling'`), renders `current / total (percentage%)` when `progress.total > 0`, renders a native `<progress>` element (implicit `progressbar` ARIA role with `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, and `aria-valuetext`), and disables `"Cancelar"` while `isCancelling` is true.
- `DeleteBatchModal.tsx:DeleteBatchModal` blocks closing and disables action buttons while `deleting` is true, renders confirmation CTA with `<Button variant="destructive">`, and resolves batch detail text via `consolidateMergedGroupTokens([batch.groupTokens])` (falling back to `batch.batch.comment` when `'No aplica'`).
- `EditMemberModal.tsx:EditMemberModal` keys `EditMemberForm` by `getMemberDocId(member)`; accepts `lifecycle?: 'draft' | 'emitted'` (default `'draft'`), `batchCodeMode`, `existingIdentities`, and `existingCodes`; in `'emitted'` mode, shows `Cédula *` locked for Scout `active` members (editable for `pending`, `exceptional`, and `no_scout` with inline duplicate/`/`/generic validation), locks the `Scout <-> no_scout` unit boundary, locks `recognition_code` once assigned and while `pending`, locks the `exceptional` checkbox once saved with a code, generates unique 6-character `REC-XXXXXX` codes in `'auto'` mode (or validates one-time manual entry in `'manual'` mode), clears unsaved codes on uncheck, and renders validation errors inline via `<Field variant="error" errorText>` and `<ErrorAlert variant="compact">`.
- `ScraperAlertModals.tsx:ScraperAlertModals` renders session-missing and session-expired alerts (using `<ErrorAlert variant="compact">` with `role="alert"`) and triggers `openModal()` from `ScraperSettingsContext`.
- `ManualMemberModal.tsx:ManualMemberModal` delegates territory dropdowns to `<MemberHierarchySelects hideWhenEmpty size="sm" layout="grid">` while keeping explicit `0` (`?? 0`) fallback on save, marks `"Cédula de Identidad *"`, `"Nombres *"`, and `"Apellidos *"` HTML `required` while JS validation checks `!identity.trim() || !firstNames.trim()`, strips non-alphanumeric/hyphen characters from `identity`, sets `verified_in_registry: unit !== 'no_scout'` with `status: 'active'`, and resets only `identity`, `firstNames`, and `lastNames` after saving.
- `memberColumns.tsx:*` provides member cell renderers (`MemberStatusBadge` for `renderMemberStatusCell`, `text-primary` mono formatting for `renderMemberCodeCell`) consumed by `batchDetailColumns.tsx`.

## Side Effects
- `EditMemberModal.tsx:EditMemberForm` awaits `onSave(editingMember)` with inline validation (no `window.alert`).
- `ScraperAlertModals.tsx:ScraperAlertModals` invokes `openModal()` from `ScraperSettingsContext`.
- `ManualMemberModal.tsx:ManualMemberModal` calls `window.alert` on missing required fields or submission failure, logs errors via `console.error`, and awaits `onSave(newMember)`.

## Verification
- Run: `npm test -- --run`
