# Shared Batch Components

## Overview
Reusable modal dialogs shared across batch list, batch detail, and batch wizard workflows for deleting batches, editing existing members, and adding manual or non-scout members.

## Interface
- `index.ts: *` (re-exports `./DeleteBatchModal`, `./EditMemberModal`, `./ManualMemberModal`)
- `DeleteBatchModal.tsx:DeleteBatchModal`, `DeleteBatchModal.tsx:DeleteBatchModalProps`
- `EditMemberModal.tsx:EditMemberModal`, `EditMemberModal.tsx:EditMemberModalProps`
- `ManualMemberModal.tsx:ManualMemberModal`, `ManualMemberModal.tsx:ManualMemberModalProps`

## Invariants
- `DeleteBatchModal.tsx:DeleteBatchModal` blocks closing and disables action buttons while `deleting` is true, and resolves batch detail text via `consolidateMergedGroupTokens([batch.groupTokens])` (falling back to `batch.batch.comment` when `'No aplica'`).
- `EditMemberModal.tsx:EditMemberModal` keys `EditMemberForm` by `member.identity`; defaults `showContactFields` to `true` (hiding `Fecha de Nacimiento *` and contact fields and rendering `Unidad Scout *` inline beside `Tipo de Miembro *` when `false`); updates `status` on unit changes for unverified members (`'no_scout'` -> `'active'`, or changing off `'no_scout'` when unverified and `'active'` -> `'pending'`); auto-generates `REC-${member.identity.slice(-4) || 'EXC'}` when enabling exceptional mode with an empty `recognition_code`; requires a non-empty `exceptional_reason` when `status === 'exceptional'`; filters `!isNoAplicaDistrict(d)` from district options; persists explicit numeric `0` (`region_id: 0`, `district_id: 0`, `group_id: 0`) when clearing Region, District, or Group or when parent changes invalidate child selections; and syncs parent `district_id`/`region_id` and `*_name` fields when selecting a positive Group.
- `ManualMemberModal.tsx:ManualMemberModal` filters `!isNoAplicaDistrict(d)` from district options, requires non-empty `identity` and `firstNames`, strips non-alphanumeric/hyphen characters from `identity`, saves explicit `0` (`?? 0`) for unset `region_id`/`district_id`/`group_id`, and sets `verified_in_registry: unit !== 'no_scout'` with `status: 'active'`.

## Side Effects
- `EditMemberModal.tsx:EditMemberForm` calls `window.alert` if `status === 'exceptional'` without `exceptional_reason`, and awaits `onSave(editingMember)`.
- `ManualMemberModal.tsx:ManualMemberModal` calls `window.alert` on missing required fields or submission failure, logs errors via `console.error`, and awaits `onSave(newMember)`.

## Verification
- Run: `npm test`
