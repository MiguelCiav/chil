# Shared Batch Components

## Overview
Reusable modal dialogs and member cell helpers shared across batch list, batch detail, and batch wizard workflows for certificate ZIP progress/cancellation, deleting batches, editing existing members, and adding manual or non-scout members.

## Interface
- `index.ts: *` (re-exports `./CertificateZipProgressModal`, `./DeleteBatchModal`, `./EditMemberModal`, `./ManualMemberModal`, `./memberColumns`)
- `CertificateZipProgressModal.tsx:CertificateZipProgressModal`, `CertificateZipProgressModal.tsx:CertificateZipProgressModalProps`
- `DeleteBatchModal.tsx:DeleteBatchModal`, `DeleteBatchModal.tsx:DeleteBatchModalProps`
- `EditMemberModal.tsx:EditMemberModal`, `EditMemberModal.tsx:EditMemberModalProps`
- `ManualMemberModal.tsx:ManualMemberModal`, `ManualMemberModal.tsx:ManualMemberModalProps`
- `memberColumns.tsx:renderMemberIdentityCell`, `memberColumns.tsx:renderMemberNameCell`, `memberColumns.tsx:renderMemberUnitCell`, `memberColumns.tsx:renderMemberTypeCell`, `memberColumns.tsx:renderMemberStatusCell`, `memberColumns.tsx:renderMemberCodeCell`

## Invariants
- `CertificateZipProgressModal.tsx:CertificateZipProgressModal` blocks backdrop closing (`onClose={() => {}}`), displays optional `scopeLabel`, switches status text between `'Preparando lote...'`, `'Generando PDFs individuales...'`, `'Comprimiendo archivo ZIP...'`, and `'Cancelando...'` (when `isCancelling || phase === 'cancelling'`), renders `current / total (percentage%)` when `progress.total > 0`, exposes `role="progressbar"` (`aria-valuetext`), and disables `"Cancelar"` while `isCancelling` is true.
- `DeleteBatchModal.tsx:DeleteBatchModal` blocks closing and disables action buttons while `deleting` is true, renders confirmation CTA with `<Button variant="destructive">`, and resolves batch detail text via `consolidateMergedGroupTokens([batch.groupTokens])` (falling back to `batch.batch.comment` when `'No aplica'`).
- `EditMemberModal.tsx:EditMemberModal` keys `EditMemberForm` by `member.identity`; defaults `showContactFields` to `true` (hiding `Fecha de Nacimiento *` and contact fields, uppercasing manual `recognition_code` edits, and rendering `Unidad Scout *` inline beside `Tipo de Miembro *` when `false`); updates `status` on unit changes for unverified members (`'no_scout'` -> `'active'`, or changing off `'no_scout'` when unverified and `'active'` -> `'pending'`); auto-generates `REC-${member.identity.slice(-4) || 'EXC'}` when enabling exceptional mode with an empty `recognition_code`; renders exceptional reason with `<Field multiline rows={3}>` and requires a non-empty value when `status === 'exceptional'`; delegates territory dropdowns to `<MemberHierarchySelects hideWhenEmpty>` persisting explicit numeric `0` (`region_id: 0`, `district_id: 0`, `group_id: 0`) on clear and syncing parent `district_id`/`region_id` on positive selections.
- `ManualMemberModal.tsx:ManualMemberModal` delegates territory dropdowns to `<MemberHierarchySelects hideWhenEmpty size="sm" layout="grid">` while keeping explicit `0` (`?? 0`) fallback on save, marks `"Cédula de Identidad *"`, `"Nombres *"`, and `"Apellidos *"` HTML `required` while JS validation checks `!identity.trim() || !firstNames.trim()`, strips non-alphanumeric/hyphen characters from `identity`, sets `verified_in_registry: unit !== 'no_scout'` with `status: 'active'`, and resets only `identity`, `firstNames`, and `lastNames` after saving.
- `memberColumns.tsx:*` provides member cell renderers (`MemberStatusBadge` for `renderMemberStatusCell`, `text-primary` mono formatting for `renderMemberCodeCell`) consumed by `batchDetailColumns.tsx`.

## Side Effects
- `EditMemberModal.tsx:EditMemberForm` calls `window.alert` if `status === 'exceptional'` without `exceptional_reason`, and awaits `onSave(editingMember)`.
- `ManualMemberModal.tsx:ManualMemberModal` calls `window.alert` on missing required fields or submission failure, logs errors via `console.error`, and awaits `onSave(newMember)`.

## Verification
- Run: `npm test`
