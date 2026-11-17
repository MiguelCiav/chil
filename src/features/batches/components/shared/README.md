# Shared Batch Components

## Overview
Reusable modal dialogs shared across batch list, batch detail, batch wizard, and success workflows for certificate ZIP progress/cancellation, deleting batches, editing existing members, and adding manual or non-scout members.

## Interface
- `index.ts: *` (re-exports `./CertificateZipProgressModal`, `./DeleteBatchModal`, `./EditMemberModal`, `./ManualMemberModal`)
- `CertificateZipProgressModal.tsx:CertificateZipProgressModal`, `CertificateZipProgressModal.tsx:CertificateZipProgressModalProps`
- `DeleteBatchModal.tsx:DeleteBatchModal`, `DeleteBatchModal.tsx:DeleteBatchModalProps`
- `EditMemberModal.tsx:EditMemberModal`, `EditMemberModal.tsx:EditMemberModalProps`
- `ManualMemberModal.tsx:ManualMemberModal`, `ManualMemberModal.tsx:ManualMemberModalProps`

## Invariants
- `CertificateZipProgressModal.tsx:CertificateZipProgressModal` blocks backdrop closing (`onClose={() => {}}`), displays optional `scopeLabel`, switches status text between `'Preparando lote...'`, `'Generando PDFs individuales...'`, `'Comprimiendo archivo ZIP...'`, and `'Cancelando...'` (when `isCancelling || phase === 'cancelling'`), renders `current / total (percentage%)` when `progress.total > 0`, exposes `role="progressbar"` (`aria-valuetext`), and disables `"Cancelar"` while `isCancelling` is true.
- `DeleteBatchModal.tsx:DeleteBatchModal` blocks closing and disables action buttons while `deleting` is true, and resolves batch detail text via `consolidateMergedGroupTokens([batch.groupTokens])` (falling back to `batch.batch.comment` when `'No aplica'`).
- `EditMemberModal.tsx:EditMemberModal` keys `EditMemberForm` by `member.identity`; defaults `showContactFields` to `true` (hiding `Fecha de Nacimiento *` and contact fields, uppercasing manual `recognition_code` edits, and rendering `Unidad Scout *` inline beside `Tipo de Miembro *` when `false`); updates `status` on unit changes for unverified members (`'no_scout'` -> `'active'`, or changing off `'no_scout'` when unverified and `'active'` -> `'pending'`); auto-generates `REC-${member.identity.slice(-4) || 'EXC'}` when enabling exceptional mode with an empty `recognition_code`; requires a non-empty `exceptional_reason` when `status === 'exceptional'`; filters `!isNoAplicaDistrict(d)` from district options; persists explicit numeric `0` (`region_id: 0`, `district_id: 0`, `group_id: 0`) when clearing Region, District, or Group or when parent changes invalidate child selections; and syncs parent `district_id`/`region_id` and `*_name` fields when selecting a positive Group.
- `ManualMemberModal.tsx:ManualMemberModal` filters `!isNoAplicaDistrict(d)` from district options, marks `"Cédula de Identidad *"`, `"Nombres *"`, and `"Apellidos *"` HTML `required` while JS validation checks `!identity.trim() || !firstNames.trim()`, strips non-alphanumeric/hyphen characters from `identity`, saves explicit `0` (`?? 0`) for unset `region_id`/`district_id`/`group_id`, sets `verified_in_registry: unit !== 'no_scout'` with `status: 'active'`, and resets only `identity`, `firstNames`, and `lastNames` after saving (retaining `unit`, `memberType`, `birthDate`, and hierarchy selections).

## Side Effects
- `EditMemberModal.tsx:EditMemberForm` calls `window.alert` if `status === 'exceptional'` without `exceptional_reason`, and awaits `onSave(editingMember)`.
- `ManualMemberModal.tsx:ManualMemberModal` calls `window.alert` on missing required fields or submission failure, logs errors via `console.error`, and awaits `onSave(newMember)`.

## Verification
- Run: `npm test`
