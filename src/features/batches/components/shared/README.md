# Shared Batch Components

## Overview
Reusable modal dialogs shared across batch list, batch detail, and batch wizard workflows for deleting batches, editing existing members, and adding manual or non-scout members.

## Interface
- `index.ts: *` (re-exports `./DeleteBatchModal`, `./EditMemberModal`, `./ManualMemberModal`)
- `DeleteBatchModal.tsx:DeleteBatchModal`, `DeleteBatchModal.tsx:DeleteBatchModalProps`
- `EditMemberModal.tsx:EditMemberModal`, `EditMemberModal.tsx:EditMemberModalProps`
- `ManualMemberModal.tsx:ManualMemberModal`, `ManualMemberModal.tsx:ManualMemberModalProps`

## Invariants
- `DeleteBatchModal.tsx:DeleteBatchModal` blocks closing and disables action buttons while `deleting` is true.
- `EditMemberModal.tsx:EditMemberModal` keys `EditMemberForm` by `member.identity`; defaults `showContactFields` to `true` (hiding `Fecha de Nacimiento *` and contact fields and rendering `Unidad Scout *` inline beside `Tipo de Miembro *` when `false`); updates `status` on unit changes for unverified members (`'no_scout'` -> `'active'`, or changing off `'no_scout'` when unverified and `'active'` -> `'pending'`); auto-generates `REC-${member.identity.slice(-4) || 'EXC'}` when enabling exceptional mode with an empty `recognition_code`; requires a non-empty `exceptional_reason` when `status === 'exceptional'`; clears dependent `district_id` (`undefined`) when changing `region_id` invalidates the child selection; and persists `group_id: 0` when clearing a member's group directly or via `region_id`/`district_id` cascade invalidation.
- `ManualMemberModal.tsx:ManualMemberModal` requires non-empty `identity` and `firstNames`, strips non-alphanumeric/hyphen characters from `identity`, and sets `verified_in_registry: unit !== 'no_scout'` with `status: 'active'`.

## Side Effects
- `EditMemberModal.tsx:EditMemberForm` calls `window.alert` if `status === 'exceptional'` without `exceptional_reason`, and awaits `onSave(editingMember)`.
- `ManualMemberModal.tsx:ManualMemberModal` calls `window.alert` on missing required fields or submission failure, logs errors via `console.error`, and awaits `onSave(newMember)`.

## Verification
- Run: `npm test`
