# Post-Emission Batch Member Lifecycle and Deterministic Merge

*   **Author:** Miguel Ciavato
*   **Status:** Implemented
*   **Date:** 2026-11-24

--------------------------------------------------------------------------------

## Overview

Chil is a single-page application for creating, auditing, and exporting Scout recognition batches backed by Cloud Firestore (with UID-scoped client session caches) and the Impeesa national registry scraper (`getMemberStatus`). Once a batch is emitted through `NewBatchWizard`, the `BatchDetail` view treats registry verification and batch membership as fixed: operators cannot re-check `pending` (unregistered or non-solvent) or `exceptional` (manually authorized without active registry verification) members against Impeesa, cannot fix a mistyped cédula (`identity`), cannot delete an erroneous member, and cannot add a single forgotten member without leaving the batch.

This design defines post-emission member lifecycle controls inside `BatchDetail` and makes batch merging (`mergeBatches`) deterministic when duplicate cédulas appear across source batches. All production changes are scoped to `src/types/batch.ts` and `src/features/batches/`; `functions/`, `scraper-api/`, and `firestore.rules` remain unchanged.

--------------------------------------------------------------------------------

## The Problem

Four gaps in the current batch workflow force multi-step workarounds or cause silent data loss:

1.  **Frozen Registry Status After Emission**: When a Scout is unregistered or non-solvent (`Inactivo`) in Impeesa during `NewBatchWizard`, the member is stored with `status: 'pending'` (and placeholder name `"Usuario No Registrado"` with no group when unregistered). Once that Scout registers and becomes solvent in Impeesa, `BatchDetail` offers no way to re-verify them or promote them to `active` with a valid `recognition_code`. Operators must create a second batch with the same cédula and merge both batches.
2.  **Unrecoverable Mistyped Cédulas and Missing Single Members**: `EditMemberModal` does not expose `identity`, and `BatchDetail` exposes no individual member deletion action and no single-member addition control. If an operator mistypes one digit of a cédula before emission, creating a new batch and merging leaves the mistyped `"Usuario No Registrado"` record permanently stranded inside the merged batch, skewing territorial counts and group-scoped PDF/ZIP export buckets. Similarly, forgetting one member forces operators to leave `BatchDetail`, create a separate single-member batch, and merge it from `BatchList`.
3.  **Silent Order-Dependent Overwrites and Persistence Bugs in `batchesCrud` / `membersCrud`**:
    *   In `mergeBatches`, duplicate non-generic cédulas across source batches write sequentially to the same Firestore document ID (`${newBatchId}_${identity}`), so the last batch in the input array silently overwrites earlier ones. Merging an older `pending` batch after a newer `active` batch destroys the active member record.
    *   In `membersCrud`, `deduplicateBatchMembers` filters coded members by `seenCodes.has(code)` without checking `identity`, silently hiding the second person if two merged batches contain two different people who share a manual `recognition_code`.
    *   `deleteMember(identityOrCode, alternativeKey, batchId)` computes `${batchId}_${alternativeKey || identityOrCode}`. When called with `recognition_code` as `alternativeKey` (or omitting `alternativeKey`), it targets `${batchId}_${recognition_code}` instead of `${batchId}_${identity}` for coded members, leaving orphaned Firestore documents after clearing them from local cache, while `matchesDeletedMember` can evict unrelated generic (`S/C`) members from cache.
4.  **Weak Post-Emission Auditability Guards**: `EditMemberModal` is shared verbatim between pre-emission drafts (`Step2ReviewConfirm`) and post-emission batches (`BatchDetail`). Post-emission `recognition_code` values remain freely editable (allowing accidental edits or unauthorized changes after certificates are issued), and promoting a member to `exceptional` in `EditMemberModal` generates a `REC-` code with a 4-character suffix (`REC-${identity.slice(-4)}`) that collides easily and ignores manual-code batches.

--------------------------------------------------------------------------------

## Goals

*   **Post-Emission Impeesa Re-Verification**: Enable per-member and batch-wide re-verification of `pending` and `exceptional` Scout members against Impeesa inside `BatchDetail`. Unconditionally overwrite profile, hierarchy, and contact fields from Impeesa on `Activo` (and on `Inactivo` for `pending` rows), clear `exceptional_reason` on activation, and issue a new locked `recognition_code` without reusing any prior exceptional code.
*   **Explicit Code Mode & Atomic Manual Assignment**: Persist optional `code_mode` (`'auto' | 'manual'`) on new and merged `Batch` records with a deterministic read-time fallback for legacy batches. Use a two-phase manual code assignment modal when re-verification activates members in a `manual` batch so Firestore never stores intermediate `active` records with empty codes.
*   **Post-Emission Immutability & In-Place Recovery**: Lock `identity` on Scout `active` members while allowing `identity` edits on `pending`, `exceptional`, and `no_scout` (non-Scout, non-registry-backed) members with atomic Firestore document-ID migration and same-batch duplicate rejection. Lock `recognition_code` once assigned and lock the `exceptional` toggle once saved with a code.
*   **Safe Member Deletion**: Allow deleting any individual member from `BatchDetail` via exact document-ID deletion with a confirmation modal, while blocking deletion when only 1 member remains in the batch.
*   **Minimal Single-Member Addition**: Provide a two-step inline control at the bottom of `BatchDetail` (`verify -> preview -> add`) so operators can add one forgotten Scout by cédula (supporting both `active` and `pending` outcomes) without creating a throwaway batch.
*   **Deterministic Batch Merging**: Resolve duplicate non-generic cédulas deterministically (`active > exceptional > pending`, then newest source `created_at`, then highest numeric `batch.id`), inherit `recognition_code` only within the same status tier, preserve distinct people who share a manual code, and display exact deduplicated counts and non-blocking duplicate-code warnings in `MergeBatchesModal`.

--------------------------------------------------------------------------------

## Non-Goals

*   **Bulk Member Addition or Wizard Duplication in `BatchDetail`**: Adding multiple members at once or creating manual `no_scout` members remains in `NewBatchWizard` plus `mergeBatches`.
*   **Scraper Backend Modifications**: No changes to `functions/` or `scraper-api/` endpoints, response contracts, or session encryption.
*   **Server-Side Firestore Security Rules Enforcement**: `firestore.rules` will not be modified to enforce field immutability on `scout_members` or `batches`; immutability is enforced in client UI and CRUD layers.
*   **External Certificate Revocation Registry**: Previously printed or downloaded physical PDFs are not tracked externally; Chil notifies the operator in-app when an `exceptional` member receives a new `recognition_code` upon activation.

--------------------------------------------------------------------------------

## Open Questions

None.

--------------------------------------------------------------------------------

## Critical User Journeys (CUJs)

### CUJ 1: Re-Verifying Pending Members in an Auto-Code or Manual-Code Batch

*   **Given**: A batch exists in `BatchDetail` containing one or more Scout members with `status: 'pending'`, and the operator has an active Impeesa scraper session.
*   **When**: The operator triggers re-verification for a single member from the row action menu or clicks **"Re-verificar (N)"** in the `BatchMembersTable` toolbar.
*   **Then**:
    *   Chil queries Impeesa for eligible non-generic Scout members (`no_scout` and generic-identity records are skipped) while displaying progress and locking concurrent batch mutations.
    *   For each `pending` member whose Impeesa status is `Activo`, Chil unconditionally overwrites profile, hierarchy, and contact fields (including blank values) with the Impeesa response, sets `status: 'active'`, and assigns a new unique `recognition_code` (generated automatically with a 6-character suffix in `auto` batches, or collected via `ManualCodeAssignmentModal` before committing in `manual` batches). Both `identity` and `recognition_code` become locked.
    *   For each `pending` member whose Impeesa status is `Inactivo`, Chil refreshes profile, hierarchy, and contact fields from Impeesa while keeping `status: 'pending'` and no `recognition_code`.
    *   For `"No registrado"`, the `pending` member remains unchanged. Summary cards, territorial cards, and export buttons update immediately.

### CUJ 2: Promoting an Exceptional Member to Active via Re-Verification

*   **Given**: A batch in `BatchDetail` contains a Scout member with `status: 'exceptional'`, a locked `recognition_code` (for example `REC-OLD123` or `SP-EXC-1`), and an `exceptional_reason`.
*   **When**: The operator re-verifies that member (individually or batch-wide) and Impeesa returns `Activo` (or returns `Inactivo` / `"No registrado"`).
*   **Then**:
    *   If Impeesa returns `Activo`, Chil unconditionally overwrites profile, hierarchy, and contact fields from Impeesa, changes `status` to `'active'`, removes `exceptional_reason`, and assigns a **new** locked `recognition_code` guaranteed to differ from the prior exceptional code (`auto` generates a unique `REC-` code with a 6-character suffix; `manual` prompts once in `ManualCodeAssignmentModal` and rejects the previous exceptional code or any duplicate code in the batch). `identity` becomes locked, and a Spanish warning toast reminds the operator to re-download the updated PDF certificate.
    *   If Impeesa returns `Inactivo` or `"No registrado"`, the `exceptional` member is not downgraded or modified, preserving its manual fields, `exceptional_reason`, and locked `recognition_code`.

### CUJ 3: Correcting a Mistyped Cédula on a Non-Active or Non-Scout Member

*   **Given**: A batch in `BatchDetail` contains a member whose cédula was mistyped (`status: 'pending'`, `status: 'exceptional'`, or `unit: 'no_scout'`).
*   **When**: The operator opens `EditMemberModal`, edits the `Cédula` field to the corrected value, and saves (then optionally clicks **"Re-verificar en Impeesa"** from the row action menu or **"Re-verificar (N)"** in the toolbar for Scout members).
*   **Then**:
    *   Chil normalizes the cédula and rejects the edit inline if another member in the same batch already has that normalized cédula (or if the input contains `/` or is empty/generic for a Scout).
    *   Firestore atomically writes the new document ID and deletes the old document ID in a single `WriteBatch`, and local session caches swap the old entry for the new one with no ghost duplicates.
    *   For Scout members who are already `status: 'active'`, the `Cédula` input is read-only and cannot be modified; post-emission, `EditMemberModal` also prevents switching between Scout units and `no_scout`.
    *   If the operator subsequently triggers **"Re-verificar en Impeesa"** on the corrected Scout member, CUJ 1 / CUJ 2 apply through the single canonical re-verification flow.

### CUJ 4: Deleting an Erroneous Member and Blocking Empty Batches

*   **Given**: A batch in `BatchDetail` contains `N` members.
*   **When**: The operator selects **"Eliminar miembro"** from a member's row action menu.
*   **Then**:
    *   If `N > 1`, `DeleteMemberModal` opens (displaying an amber warning if the member holds a `recognition_code`). Upon confirmation, Chil deletes the exact member document from Firestore and session caches, updates summary/territorial counts, clears stale menu/quick-view state, and clamps table pagination if the current page becomes empty.
    *   If `N <= 1`, the **"Eliminar miembro"** action is disabled with a Spanish tooltip instructing the operator to delete the batch instead, and the handler rejects deletion.

### CUJ 5: Adding a Single Missing Member at the Bottom of `BatchDetail`

*   **Given**: An operator realizes one Scout was left out of an existing batch in `BatchDetail`.
*   **When**: The operator enters the Scout's cédula in `AddSingleMemberCard` at the bottom of `BatchDetail`, clicks **"Verificar en Impeesa"**, reviews the inline preview card (name, status, group/unit, and generated or manual code), and clicks **"Agregar al lote"**.
*   **Then**:
    *   Empty inputs, generic tokens (`S/C`, `N/A`), inputs containing `/`, and normalized cédulas already present in the batch are rejected inline before calling Impeesa.
    *   If Impeesa returns `Activo`, the member is added with `status: 'active'`, locked `identity`, and a locked `recognition_code` (unique auto `REC-` code or validated unique manual code).
    *   If Impeesa returns `Inactivo` or `"No registrado"`, the preview displays an amber warning and allows adding the member with `status: 'pending'` and no `recognition_code`.
    *   If the Impeesa session is disconnected/expired, `ScraperAlertModals` opens without entering preview; if a transient network error occurs, an inline error displays on Step 1 without creating a `"Usuario No Registrado"` placeholder.

### CUJ 6: Merging Batches Deterministically With Duplicate Cédulas or Repeated Manual Codes

*   **Given**: Two or more batches in `BatchList` are selected for merging in `MergeBatchesModal`. Some source batches share the same non-generic cédula (for example an older `pending` batch and a newer `active` batch), and two distinct people in different batches may share an identical manual `recognition_code`.
*   **When**: The operator opens `MergeBatchesModal` and confirms the merge.
*   **Then**:
    *   Before confirming, `MergeBatchesModal` displays the exact deduplicated member count, the number of consolidated duplicates, and a non-blocking amber warning if distinct people share a manual `recognition_code`.
    *   `mergeBatches` resolves every colliding non-generic cédula deterministically (`active > exceptional > pending`, then newest source batch `created_at`, then highest numeric `batch.id`), retaining the winner's `recognition_code` or falling back to a loser's code only within the same status tier.
    *   All superseded source member documents are deleted, both distinct people sharing a manual code survive in Firestore and UI, and the merged batch persists `code_mode` consistently.

--------------------------------------------------------------------------------

## Technical Plan (Architecture)

All changes stay inside `src/types/batch.ts` and `src/features/batches/`, preserving Chil's acyclic feature layering (`types/ <- utils/ <- api/ <- hooks/ & components/`). Pure utilities in `utils/` have zero runtime imports from `api/`, `components/`, or Firebase. Existing domain-agnostic primitives in `src/components/` and both scraper backends (`functions/`, `scraper-api/`) remain untouched.

### 1. Data Model, Document Identity & Persistence Contracts

#### 1.1 Document Identity & Generic Tokens (`utils/memberIdentity.ts`)

*   In Firestore `scout_members`, each document ID is derived deterministically by `getMemberDocId(member)`:
    *   Prefix with `${batch_id}_` when `batch_id` is a valid number.
    *   Suffix resolves in priority order: trimmed non-generic `identity`, else trimmed `recognition_code`, else `SC_${FIRST}_${LAST}`, else `SC`.
    *   Generic identity tokens (`''`, `'S/C'`, `'N/A'`, `'NO_DISPONIBLE'`, `'SIN CEDULA'`, `'NONE'`, case-insensitive) represent members without a cédula (`isGenericIdentity`).
*   `isGenericIdentity` and `getMemberDocId` move from `api/membersCrud.ts` into `utils/memberIdentity.ts` (re-exported from `api/membersCrud.ts` for barrel compatibility) alongside `normalizeCedula` and `isSameIdentity`.
*   `normalizeCedula` strips formatting and Venezuelan/institutional prefix letters to digits-only for numeric cédulas while rejecting `/` (which would create invalid multi-segment Firestore document paths).

#### 1.2 Optional `code_mode` on `Batch` (`src/types/batch.ts`, `batchesCrud.ts`, `NewBatchWizard.tsx`)

*   Add optional `code_mode?: 'auto' | 'manual'` to `Batch` and `BatchCreationParams` (omitted when undefined so Firestore `setDoc` never receives `undefined`).
*   Lift `codeMode` state from `Step2ReviewConfirm` into `NewBatchWizard` so Step 1 <-> Step 2 navigation preserves it, flip `codeMode` to `'manual'` on manual inline code edits or clear-codes actions, and compute persisted `code_mode` defensively at emission (`'manual'` if the toggle is manual or any code deviates from auto format).
*   In `mergeBatches`, resolve each source batch's effective mode before building the merged batch record: persist the shared mode when all sources agree, or `'manual'` when mixed.
*   Legacy `Batch` documents without `code_mode` require no backfill; `inferBatchCodeMode` resolves their mode at read time (recognizing both 6-character auto codes and legacy 4-digit/`EXC` exceptional codes as `'auto'`).

#### 1.3 Unified Key-Diff Persistence & Exact Deletion (`api/membersCrud.ts`)

*   Remove the dead, buggy `deleteMember`, `removeMemberFromCache`, and `matchesDeletedMember` APIs (zero production callers) and expose `deleteBatchMember(member)`, which deletes the exact Firestore document ID and evicts only that document ID from warm session caches (`membersByUserCache` and `coldMembersByBatchCache`).
*   Introduce one unified key-diffing write primitive `saveBatchMemberUpdates(updates, userId?)` used by post-emission edits, single re-verifications, and batch-wide re-verifications alike. Whenever an update provides a `previous` member whose document ID differs from the sanitized `next` member's document ID (including identity edits, generic `S/C` name/code edits, or non-canonical legacy IDs), the write emits both `set(newDocId)` and `delete(oldDocId)` inside one `WriteBatch` (chunked at 450 operations if needed) and evicts `oldDocId` from warm caches before upserting `next`.
*   Keep `ScoutMember` free of synthetic storage fields (`_docId`). Track any non-canonical legacy `docSnapshot.id` outliers privately inside `membersCrud.ts` via `createKeyedSessionCache` (automatically cleared on auth changes by `clearAllSessionCaches()`).
*   Update `deduplicateBatchMembers` (including `finalizedIdentities` and `filterUniqueDraftMembers`) to normalize non-generic identities via `normalizeCedula` and preserve all generic (`S/C`) rows without deduplicating them, ensuring distinct people sharing a manual `recognition_code` are never dropped.
*   Every create and update path explicitly stamps `batch_id` and `user_id` so records remain visible in user-scoped queries across `BatchList`, `SummaryView`, and `Statistics`.

### 2. Pure Domain Rules & State Transitions (`src/features/batches/utils/`)

#### 2.1 Code Mode Inference, Generation & Validation (`codeGenerator.ts`)

*   `inferBatchCodeMode(members, batch?)`: returns `batch.code_mode` when set; otherwise returns `'auto'` when zero non-empty codes exist or every code matches the auto/legacy-exceptional `REC-` pattern, else `'manual'`.
*   `generateUniqueRecognitionCode(existingCodes, excludedCodes?, prefix)`: generates unique 6-character-suffix `REC-` codes disjoint from existing batch codes and any prior exceptional code.
*   `validateManualRecognitionCode(rawCode, existingCodes, excludedCodes?)`: trims and uppercases input, rejecting empty strings, duplicates in `existingCodes`, and reuse of `excludedCodes`.

#### 2.2 Shared Verification Pool & Re-Verification Transitions (`scraperVerificationPool.ts`)

*   Extract `runVerificationPool` from `NewBatchWizard.tsx` (probe-first on item `0`, 4-worker concurrency pool, injected `shouldAbort` session-error circuit breaker, and local cancellation check) alongside pure `buildScrapedMemberRecord` and `buildUnregisteredMemberRecord` (relocated from `components/wizard/wizardHelpers.ts`, which re-exports them).
*   Filter out `no_scout` and generic-identity members via `isReverifiableMember` before entering batch-wide re-verification.
*   `applyReverificationResult` builds updated records fresh from `buildScrapedMemberRecord` (preserving `existingMember.identity`, `batch_id`, `user_id`, and omitting stale legacy fields) and compares sanitized before/after payloads so unchanged `pending` + `Inactivo` rows produce 0 Firestore writes:

| Existing Status | Impeesa Response | Resulting Status | Fields Overwritten? | `exceptional_reason` | `recognition_code` Action |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `pending` | `Activo` | `active` | Unconditionally overwritten by Impeesa (including blank fields) | `undefined` | Assign new locked code (`auto` or 2-phase `manual`) |
| `pending` | `Inactivo` | `pending` | Refreshed from Impeesa if any field changed (replaces `"Usuario No Registrado"`) | `undefined` | Remains empty |
| `pending` | `"No registrado"` | `pending` | Unchanged (0 writes) | `undefined` | Remains empty |
| `exceptional` | `Activo` | `active` | Unconditionally overwritten by Impeesa | Cleared (`undefined`) | Assign new locked code `!== previousCode` (`auto` or 2-phase `manual`) + PDF warning toast |
| `exceptional` | `Inactivo` / `"No registrado"` | `exceptional` | Unchanged (0 writes) | Preserved | Preserved (locked) |

#### 2.3 Deterministic Merge Resolution (`memberMerge.ts`)

*   `deduplicateMergedMembers(entries, options?)` groups non-generic members by `normalizeCedula(member.identity)` (preserving the winner's original `member.identity`) and keeps every generic-identity member intact (appending `_2`, `_3` suffixes only if two generic survivors collide on `newDocId`).
*   Colliding non-generic candidates sort deterministically by:
    1.  Status rank descending: `active (3) > exceptional (2) > pending (1) > unknown (0)`.
    2.  Source batch `created_at` timestamp descending (invalid timestamps treated as `0`).
    3.  Source `batch.id` numeric descending (`b.id - a.id`).
*   The winner retains its own `recognition_code` when non-empty; otherwise it inherits the first non-empty code from a loser **only within the same status tier** (never copying an `exceptional` code onto an `active` winner).
*   `findCrossIdentityCodeConflicts(members)` identifies any non-empty `recognition_code` shared by two or more distinct members for `MergeBatchesModal`'s non-blocking amber warning.

### 3. System Data Flows

#### 3.1 Batch-Wide and Single-Member Re-Verification Flow (Two-Phase Commit)

```text
BatchDetail ("Re-verificar (N)" toolbar or Row Action "Re-verificar en Impeesa")
  │
  ├─► Check session via useScraperSessionGuard (if disconnected -> ScraperAlertModals)
  │
  ├─► Lock batch mutations (isReverifying = true) & runVerificationPool
  │     (probe item 0 -> 4-worker pool + session circuit breaker + unmount cancelledRef)
  │     └─► getMemberStatus(normalizedCedula) [existing functions/ or scraper-api/]
  │         ("No registrado" -> null; session error -> abort; network error -> count & skip)
  │
  ├─► applyReverificationResult() per item -> classify:
  │     - newlyActive (pending -> active, exceptional -> active [tracks previousCode])
  │     - refreshedPending (pending + Inactivo with changed fields)
  │     - unchanged / networkErrors
  │
  ├─► Always commit code-free refreshedPending immediately (if any) via saveBatchMemberUpdates
  │
  ├─► Branch on inferBatchCodeMode(members, batch) for newlyActive:
  │     ├─ 'auto':
  │     │    generateUniqueRecognitionCode(existingCodes, [previousCode])
  │     │    └─► saveBatchMemberUpdates(newlyActive) -> Firestore + sessionCache
  │     │        If sessionError occurred mid-run -> open ScraperAlertModals
  │     │
  │     └─ 'manual' (when newlyActive.length > 0):
  │          open ManualCodeAssignmentModal alone (if sessionError also occurred mid-run,
  │          mark session expired and show inline amber reconnect note; no stacked modals)
  │          user enters 1 unique code per newlyActive member (rejects previousCode)
  │          └─► on confirm -> saveBatchMemberUpdates(newlyActive) -> Firestore + sessionCache
  │
  └─► Refresh local members state + summary/territorial cards; unlock mutations
      If any exceptional -> active: show warning toast to re-download updated PDF
      If any networkErrors: include error count in summary toast
```

#### 3.2 Post-Emission Edit, Identity Migration & Member Deletion Flow

```text
EditMemberModal (lifecycle="emitted" from BatchDetail; default lifecycle="draft" in Step2ReviewConfirm)
  ├─ Scout + active           -> identity LOCKED; unit locked to Scout units; recognition_code LOCKED
  ├─ no_scout + active        -> identity EDITABLE; unit LOCKED to no_scout; recognition_code LOCKED
  ├─ exceptional (with code)  -> identity EDITABLE; unit locked to Scout units; recognition_code LOCKED;
  │                              exceptional checkbox LOCKED; reason & other fields editable
  └─ pending                  -> identity EDITABLE; unit locked to Scout units; recognition_code hidden/disabled
                                 until exceptional checked (auto generates 6-char code & locks; manual unlocks 1-time input)

On Save:
  ├─ Validate identity (non-empty/non-generic for Scouts, no '/', not duplicated in batch) via Field variant="error"
  └─► saveBatchMemberUpdates([{ previous, next }], userId)
        └─► Single WriteBatch: set(newDocId) + delete(oldDocId) when doc IDs differ
        └─► Session caches: evict oldDocId + upsert next

DeleteMemberModal (row menu; disabled when members.length <= 1 or isReverifying)
  └─► Confirm -> deleteBatchMember(member)
        └─► deleteDoc(actualDocId) + exact docId cache eviction
        └─► Clear activeMenuMemberId / viewingMember; clamp pageIndex in BatchDetail useEffect
```

#### 3.3 Single-Member Addition Flow (`AddSingleMemberCard`)

```text
AddSingleMemberCard (bottom of BatchDetail; disabled while isReverifying)
  Step 1: Operator enters cédula -> validate non-empty, non-generic, no '/', not duplicate in batch
          -> click "Verificar en Impeesa" (invalidates prior preview if cédula changes)
          -> discriminated union: found | not_found | aborted (ScraperAlertModals) | error (inline)
  Step 2: Inline preview card displays:
          - Activo: Name, active badge, Group/Unit + auto REC-XXXXXX (or validated manual code Field)
          - Inactivo / No registrado: Name (or "Usuario No Registrado"), pending badge,
            amber warning (no recognition_code)
  Step 3: Operator clicks "Agregar al lote"
          -> createMember(stamped with batch_id & user_id) -> Firestore + sessionCache
          -> BatchDetail refreshes members, totals, territorial card, and export buckets
```

#### 3.4 Deterministic `mergeBatches` Flow

```text
BatchList (hoists membersByBatchId useMemo; 0 extra Firestore reads)
  └─► MergeBatchesModal (receives optional BatchMergeOption.members)
        └─► deduplicateMergedMembers(selectedBatchEntries)
              ├─ Displays: "<K> miembros únicos (<D> duplicados consolidados)"
              └─ Displays amber non-blocking warning if crossIdentityCodeConflicts.length > 0

On Confirm -> batchesCrud.mergeBatches(params, userId):
  1. Deduplicate params.batchIds; fetch existingBatches and membersByBatch
  2. Run deduplicateMergedMembers(membersByBatch) + resolve merged code_mode
  3. Build mergedBatch (persisting code_mode)
  4. Commit writes:
       - <= 450 total ops: single atomic WriteBatch (creates + deletes together)
       - > 450 total ops: create-before-delete chunk barrier (all set chunks first, then delete chunks)
       - 1 set() per survivor; delete every oldDocId where !survivingDocIds.has(oldDocId)
  5. Update warm session caches (remove source batches/members, upsert merged batch + survivors)
```

### 4. UI & Hook Decomposition Boundaries

*   **`hooks/useScraperSessionGuard.ts`**: Small shared hook consumed by both `NewBatchWizard` and `BatchDetail` to check `ScraperSettingsContext` session state, handle `ScraperSessionError`, and supply `ScraperAlertModals` props.
*   **`hooks/useBatchReverification.ts`**: Focused hook for `BatchDetail` owning Impeesa re-verification, `isReverifying` global mutation lock, unmount `cancelledRef`, `ManualCodeAssignmentModal` staging, and session-expiry handling. Simple single-call edit, delete, and single-member add handlers stay directly in `BatchDetail.tsx` (alongside `autoResetPageIndex: false` and a pagination-clamp `useEffect`).
*   **`components/shared/ScraperAlertModals.tsx`**: Moved directly from `components/wizard/ScraperAlertModals.tsx` (old file deleted; internal imports updated).
*   **`components/shared/EditMemberModal.tsx`**: Extended with `lifecycle?: 'draft' | 'emitted'`, `batchCodeMode`, `existingIdentities`, and `existingCodes` (no async scraper props); uses `Field` `variant="error"` + `errorText` and `<ErrorAlert variant="compact" />`, keyed by `getMemberDocId(member)`.
*   **`components/detail/`**: Adds `ManualCodeAssignmentModal.tsx`, `DeleteMemberModal.tsx`, and `AddSingleMemberCard.tsx`; extends `BatchMembersTable.tsx` (`"Re-verificar (N)"` toolbar button + progress) and `batchDetailColumns.tsx` (row **"Re-verificar en Impeesa"** and **"Eliminar miembro"** actions). Leaves `batchDetailTour.ts` unchanged to preserve existing 4-step walkthrough flows on completed batches.

--------------------------------------------------------------------------------

## Alternatives Considered

### Alternative 1: Keep Create-New-Batch + Merge as the Only Remediation Path (Status Quo)

*   **Pros**: Zero new UI controls or mutation paths inside `BatchDetail`; keeps `BatchDetail` mostly read-only.
*   **Cons**: Forces operators to leave the batch and create throwaway batches to re-verify a single newly solvent Scout or add one forgotten member; leaves mistyped cédulas permanently stranded inside merged batches; exposes operators to silent order-dependent overwrites during merges.
*   **Reason for Rejection**: Fails both core edge cases (`pending` re-verification and mistyped cédulas) and forces multi-step workarounds for single-member corrections.

### Alternative 2: Passive UI Tip in `BatchDetail` Instead of Single-Member Addition

*   **Pros**: Smaller surface area in `BatchDetail`; avoids adding `AddSingleMemberCard`.
*   **Cons**: Forces operators to leave `BatchDetail`, create a single-member batch in `NewBatchWizard`, navigate back to `BatchList`, and merge both batches—even though `BatchDetail` already connects to `getMemberStatus` and member mutations.
*   **Reason for Rejection**: A minimal two-step single-cédula card at the bottom of `BatchDetail` handles single forgotten members directly while keeping multi-member additions on batch creation plus merge.

### Alternative 3: Preserve Manual Edits or Retain Previous `recognition_code` on `exceptional` -> `active`

*   **Pros**: Avoids invalidating an already-printed exceptional certificate code and preserves any manually edited profile fields.
*   **Cons**: Allows an `active` member to carry an exceptional-era code, leaves manual profile overrides out of sync with the Impeesa national registry, and weakens post-emission auditability if codes remain mutable.
*   **Reason for Rejection**: Once verified `Activo` in Impeesa, Impeesa is the authoritative source for Scout data, the member cannot remain `exceptional`, and a new locked `recognition_code` must be issued to prevent reusing exceptional codes.

### Alternative 4: Preserve Manual `email`/`phone` When Impeesa Returns Blank Values

*   **Pros**: Prevents clearing manually entered contact details when the same cédula is re-verified and Impeesa omits `email` or `phone`.
*   **Cons**: Introduces conditional field-merge rules that differ between same-cédula re-verifications and changed-cédula updates, risking stale contact details surviving across refreshes.
*   **Reason for Rejection**: Unconditionally overwriting all fields from Impeesa establishes a uniform rule with no hidden exceptions.

### Alternative 5: Ignore Impeesa `Inactivo` Responses When Re-Verifying `pending` Members

*   **Pros**: Single condition ("only overwrite when `Activo`"); never modifies temporary edits made on `pending` rows.
*   **Cons**: Leaves `"Usuario No Registrado"` placeholders and `"Sin grupo asignado"` territorial buckets unchanged even when the Scout exists in Impeesa and only lacks current solvency.
*   **Reason for Rejection**: Refreshing `pending` profile and hierarchy fields on `Inactivo` corrects territorial distribution and signals that the cédula exists and only lacks solvency.

### Alternative 6: Block Cédula Correction or Single-Member Addition Unless Impeesa Returns `Activo`

*   **Pros**: Guarantees every corrected or newly added member is immediately solvent and active.
*   **Cons**: Traps operators with a mistyped cédula whenever the real member is not yet solvent or requires exceptional authorization, and prevents adding a missing `pending` Scout (to be optionally authorized as `exceptional` afterward in `EditMemberModal`) without creating a throwaway batch.
*   **Reason for Rejection**: Operators must be able to fix mistyped cédulas and add missing `pending` records directly inside `BatchDetail` with clear inline warnings.

### Alternative 7: Allow Unchecking `exceptional` Back to `pending` Post-Emission

*   **Pros**: Lets an operator undo an accidental exceptional authorization in one click without deleting the member.
*   **Cons**: Either erases an immutable `recognition_code` (opening a path to regenerate codes after emission) or leaves a `pending` member carrying a recognition code.
*   **Reason for Rejection**: Locking the `exceptional` toggle once saved with a code preserves code immutability; operators can still transition to `active` via Impeesa or delete the member.

### Alternative 8: Lock `identity` Uniformly on Active `no_scout` Members

*   **Pros**: Zero exceptions to the rule "`status === 'active'` implies locked cédula".
*   **Cons**: `no_scout` members never come from Impeesa (they are always saved as `active`), and `AddSingleMemberCard` only verifies Scout cédulas against Impeesa; locking `no_scout` cédulas would trap typos without a direct delete-and-readd path in `BatchDetail`.
*   **Reason for Rejection**: Allowing in-place `identity` correction for `unit === 'no_scout'` (while keeping `recognition_code` locked) avoids stranding typoed non-Scout records because they are not registry-backed.

### Alternative 9: Allow Deleting the Last Remaining Member in a Batch

*   **Pros**: No `members.length <= 1` guard needed in the table row menu or handler.
*   **Cons**: Leaves empty 0-member orphan batches in Firestore and `BatchList`.
*   **Reason for Rejection**: Blocking deletion of the final member guides operators to delete the entire batch via `DeleteBatchModal` instead.

### Alternative 10: Pure Read-Time `code_mode` Inference and Deferred Empty-Code Commits for Manual Batches

*   **Pros**: Requires zero new fields on `Batch` and no `ManualCodeAssignmentModal`.
*   **Cons**: Pure inference cannot distinguish all-`pending` manual batches from auto batches; committing newly-active members with empty codes leaves intermediate `active` records unable to export certificates and requires storing a `revoked_recognition_codes` array on `ScoutMember` to block reuse across reloads.
*   **Reason for Rejection**: Persisting optional `code_mode` on new/merged batches (with read-time fallback for legacy batches) and staging manual-code re-verification in `ManualCodeAssignmentModal` prevents intermediate empty-code `active` records without expanding the member schema.

### Alternative 11: Block `mergeBatches` When Distinct Identities Share a Manual `recognition_code`

*   **Pros**: Enforces strict `recognition_code` uniqueness inside every merged batch.
*   **Cons**: Because emitted codes are locked post-emission in `BatchDetail`, blocking merges on legacy duplicate manual codes forces operators to delete a valid member or an entire batch before merging.
*   **Reason for Rejection**: Fixing `deduplicateBatchMembers` so distinct people are never dropped and showing a non-blocking warning in `MergeBatchesModal` prevents data loss without deadlocking historical merges.

### Alternative 12: Host Async Impeesa Re-Verification Inside `EditMemberModal`

*   **Pros**: Lets an operator edit a cédula and re-verify inside a single modal dialog.
*   **Cons**: Duplicates the Impeesa re-verification, `previousCode` exclusion, and manual code assignment workflow already provided by row/toolbar re-verification plus `ManualCodeAssignmentModal`; risks stacked `ScraperAlertModals` over `EditMemberModal`; and turns a synchronous form into an async state machine.
*   **Reason for Rejection**: Keeping `EditMemberModal` synchronous (edit + save atomic doc-ID migration) and using the single canonical **"Re-verificar en Impeesa"** row/toolbar flow eliminates duplicated logic and stacked modals.

--------------------------------------------------------------------------------

## Non-Functional Requirements

*   **Firestore Read/Write Efficiency (Spark Quota Safety)**:
    *   `MergeBatchesModal` computes exact deduplicated counts and cross-identity code conflict warnings in memory from `BatchList`'s already-loaded `members` array (**0 extra Firestore reads**).
    *   Batch-wide re-verification writes only changed members via `saveBatchMemberUpdates` (**0 writes** for unchanged members, verified by normalized field equality; single atomic `WriteBatch` for `<= 450` operations, or sequential 450-operation chunks via `commitChunkedBatches` above 450).
    *   Identity/doc-ID migration writes the new document and deletes the old document in a single atomic `WriteBatch` (**2 writes**, **0 reads**), updating warm session caches via write-through.
    *   `deleteBatchMember` executes **1 Firestore delete** (`deleteDoc`) and **0 reads**, keeping warm session caches synchronized.
    *   Batch-wide re-verification reuses the probe-first + 4-worker concurrency pool + mid-batch circuit breaker so an expired Impeesa session fails on the 1st request without firing `N - 1` wasted serverless invocations.
*   **Security & Integrity Boundaries**:
    *   `firestore.rules` is unchanged (`scraper_sessions/{uid}` keeps `allow read, write: if false`; `batches` and `scout_members` remain client-validated). Immutability rules (`identity` lock on Scout `active` members, `recognition_code` lock, `exceptional` checkbox lock, `Scout <-> no_scout` unit boundary, and `members.length <= 1` delete guard) are enforced in UI controls and mutation handlers to prevent accidental edits.
    *   No Impeesa credentials are stored in browser storage; all scraper calls route through `scraperApi.ts` (`ScraperSettingsContext`).
*   **Backward Compatibility & Rollout Safety**:
    *   `Batch.code_mode` is optional; legacy Firestore `batches` documents work without backfill via `inferBatchCodeMode` (including legacy 4-digit/`EXC` exceptional codes).
    *   `EditMemberModal` defaults to `lifecycle = 'draft'`, preserving existing pre-emission `Step2ReviewConfirm` behavior.

--------------------------------------------------------------------------------

## Risks & Mitigations

| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| **Client-only immutability on open `firestore.rules`** | Because `firestore.rules` permits open read/write on `batches` and `scout_members`, a malicious client bypassing the UI can still mutate Firestore directly. | Document explicitly as a non-goal; UI + CRUD locks prevent accidental operator edits, while future server-side security rules can enforce the same invariants without schema changes. |
| **Non-atomic chunked writes above 450 Firestore operations** | `mergeBatches` exceeding ~223 surviving members (`> 450` ops) or `saveBatchMemberUpdates` exceeding 450 ops splits across sequential `WriteBatch` commits; a mid-run network failure can leave partial state. | Keep the single atomic `WriteBatch` fast path for `<= 450` ops. For `> 450` ops in `mergeBatches`, commit all `set` chunks before any `delete` chunks so a mid-merge failure never destroys surviving source data (worst case is recoverable duplicate batches). |
| **Legacy non-canonical Firestore document IDs** | Historical `scout_members` documents written without `${batchId}_` or with un-normalized IDs could survive a `deleteDoc(getMemberDocId(member))` call as silent no-ops and resurrect on reload. | Track non-canonical `docSnapshot.id` outliers privately inside `membersCrud.ts` via `createKeyedSessionCache` (cleared by `clearAllSessionCaches()`) and delete by the actual recorded doc ID when present, keeping `ScoutMember` free of synthetic fields. |
| **Multi-tab session cache skew** | Two browser tabs open on the same account hold independent in-memory session caches; mutating a member in Tab A is not reflected in Tab B until reload. | Existing Chil architecture (documented in `firestore-consumption-optimization.md`); write-through keeps the active tab consistent and reload reconciles from Firestore. |
| **Transient Impeesa outages or HTTP 500/504 errors** | Treating transient scraper failures as `"No registrado"` would create erroneous `"Usuario No Registrado"` pending records or silently skip failures. | Map only `errStr.includes('No registrado')` to `'not_found'`; surface transient errors inline in `AddSingleMemberCard` (staying on Step 1) and report transient error counts in the batch re-verification summary toast. |
| **Concurrent batch mutations during 15–30s re-verification** | Editing, deleting, or adding members while `runVerificationPool` is in flight could resurrect deleted members or generate colliding codes against a stale snapshot. | Enforce a single `isReverifying` lock disabling row edit/delete/single-verify, `AddSingleMemberCard`, and `DeleteBatchModal` until re-verification finishes, and stop dequeuing/state updates via a local `cancelledRef` on unmount. |

--------------------------------------------------------------------------------

## Additional Resources

*   [docs/designs/SITEMAP.md](./SITEMAP.md) — Canonical index of Chil design specifications and feature blueprints.
*   [docs/designs/firestore-consumption-optimization.md](./firestore-consumption-optimization.md) — Session cache (`src/lib/sessionCache.ts`), write-through updates, deferred atomic batch emission, and probe-first scraper pool invariants.
*   [docs/designs/multi-territory-batch-attribution.md](./multi-territory-batch-attribution.md) — Read-time territorial projection, `resolveMemberHierarchy` invariants, and 4-step `batchDetailTour.ts` stability precedent.
*   [AGENTS.md](../../AGENTS.md) — Repository guardrails, verification pipeline, and documentation sync rules.
*   [src/features/batches/README.md](../../src/features/batches/README.md) and submodule blueprints: [api](../../src/features/batches/api/README.md), [components](../../src/features/batches/components/README.md), [hooks](../../src/features/batches/hooks/README.md), [types](../../src/features/batches/types/README.md), and [utils](../../src/features/batches/utils/README.md).

--------------------------------------------------------------------------------

## Detailed Implementation Plan

Work is partitioned into **5 incremental phases**. Each phase leaves the repository lint-clean, buildable, and test-passing before the next phase starts. No files in `src/components/`, `functions/`, `scraper-api/`, `firestore.rules`, `src/features/batches/api/index.ts` (already uses wildcard re-exports), or `src/features/batches/components/detail/batchDetailTour.ts` are modified.

---

### Phase 1: Domain Types & Pure Acyclic Utilities

#### 1. `src/types/batch.ts` (Modify)
*   **Type / Scope**: Shared TypeScript domain type.
*   **Proposed Changes**: Export `BatchCodeMode = 'auto' | 'manual'` and add optional `code_mode?: BatchCodeMode` to `Batch` and `BatchCreationParams`.

#### 2. `src/features/batches/utils/memberIdentity.ts` (Create)
*   **Type / Scope**: Pure TypeScript utility module (zero Firebase or `api/` imports).
*   **Proposed Changes**:
    *   Move `isGenericIdentity(id?: string): boolean` and `getMemberDocId(member): string` here from `api/membersCrud.ts` (breaking the `utils/ <-> api/` cycle).
    *   Export `hasInvalidDocPathChars(raw?: string): boolean` returning `true` when the trimmed string contains `'/'`.
    *   Export `normalizeCedula(raw?: string): string`: trims input; if `isGenericIdentity(raw)` is `true`, returns trimmed uppercase token; if `/^(?:[VEJGP]-?)?\d[\d.\-\s]*$/i.test(trimmed)` matches, strips all non-digits (`replace(/\D/g, '')`); otherwise returns trimmed uppercase string.
    *   Export `isSameIdentity(a?: string, b?: string): boolean`: returns `false` if either side is generic; otherwise compares `normalizeCedula(a) === normalizeCedula(b)`.
    *   Unifies identity normalization across `EditMemberModal`, `AddSingleMemberCard`, `memberMerge.ts`, and `membersCrud.ts`.

#### 3. `src/features/batches/utils/codeGenerator.ts` (Modify)
*   **Type / Scope**: Pure TypeScript utility module.
*   **Proposed Changes**:
    *   Export `AUTO_CODE_PATTERN = /^REC-[A-HJ-NP-Z2-9]{6}$/` and `LEGACY_AUTO_CODE_PATTERN = /^REC-(?:[A-HJ-NP-Z2-9]{6}|\d{4}|EXC)$/`.
    *   Export `inferBatchCodeMode(members: ScoutMember[], batch?: Pick<Batch, 'code_mode'> | null): BatchCodeMode`: returns `batch.code_mode` if `'auto'` or `'manual'`; otherwise collects trimmed non-empty `recognition_code` values and returns `'auto'` when count is `0` or every code matches `LEGACY_AUTO_CODE_PATTERN`, else `'manual'`.
    *   Export `generateUniqueRecognitionCode(existingCodes: Iterable<string>, excludedCodes?: Iterable<string>, prefix = 'REC'): string`: builds a case-insensitive blocked `Set` from `existingCodes` union `excludedCodes` and loops `generateRecognitionCode(prefix, 6)` until a non-blocked code is produced.
    *   Export `validateManualRecognitionCode(rawCode: string, existingCodes: Iterable<string>, excludedCodes?: Iterable<string>): { normalized: string; error: string | null }`: trims and uppercases `rawCode`, requires a non-empty value absent from `existingCodes` and `excludedCodes`, and returns Spanish error messages (`"Debe ingresar un código de reconocimiento."`, `"El nuevo código no puede ser igual al código excepcional anterior."`, `"Este código ya está asignado a otro miembro del lote."`).

#### 4. `src/features/batches/utils/scraperVerificationPool.ts` (Create)
*   **Type / Scope**: Pure verification pool orchestration, record builders, and state-transition utility (zero Firebase or runtime `api/` imports; uses `import type { ScraperMemberDetails } from '../api/scraperApi'`).
*   **Proposed Changes**:
    *   Relocate pure `InitialMemberHierarchy`, `buildUnregisteredMemberRecord`, and `buildScrapedMemberRecord` from `components/wizard/wizardHelpers.ts` (eliminating `utils/ -> components/` layer inversion).
    *   Export `VERIFICATION_POOL_CONCURRENCY = 4`, `VerificationProgress = { current: number; total: number }`, and `runVerificationPool<TInput, TResult>({ items, verifyItem, concurrency = VERIFICATION_POOL_CONCURRENCY, shouldAbort, isCancelled, onProgress }): Promise<{ results: Map<TInput, TResult>; sessionError: Error | null }>`: returns empty `Map` and `null` immediately when `items.length === 0`; runs `items[0]` as probe first, then remaining items across `min(concurrency, remaining.length)` workers, checking `isCancelled?.()` before dequeuing and aborting all workers via `shouldAbort?.(err)` on session errors; invokes `onProgress({ current, total })` after each settled item.
    *   Export `ReverificationOutcomeKind = 'activated' | 'refreshed_pending' | 'unchanged'`, `ReverificationOutcome = { kind: ReverificationOutcomeKind; member: ScoutMember; previousCode?: string; previousStatus: ScoutMember['status']; wasExceptional: boolean }`, `isReverifiableMember(member: ScoutMember): boolean`, and `applyReverificationResult(existingMember: ScoutMember, scrapedDetails: ScraperMemberDetails | null, options?: { batchId?: number; userId?: string; newIdentity?: string }): ReverificationOutcome`.
    *   Status classification: `scrapedDetails === null` -> `'No registrado'`; `scrapedDetails.status?.trim().toLowerCase() === 'activo'` -> `'Activo'`; any other non-null response -> `'Inactivo'`.
    *   Construct updated records fresh from `buildScrapedMemberRecord(options?.newIdentity ?? existingMember.identity, scrapedDetails, undefined, undefined, options?.batchId ?? existingMember.batch_id ?? null, options?.userId ?? existingMember.user_id)` so legacy fields (`unit_id`, `member_category`, `entry_date`, `exceptional_reason`) never leak from `existingMember`.
    *   For `pending` + `Activo`: return `kind: 'activated'` leaving `recognition_code` unassigned for the caller. For `exceptional` + `Activo`: return `kind: 'activated'` with `previousCode: existingMember.recognition_code` and `wasExceptional: true`. For `pending` + `Inactivo`: compare normalized field snapshots of `existingMember` vs `nextMember`; return `kind: 'refreshed_pending'` only if any field changed, else `kind: 'unchanged'` (0 Firestore writes). For `pending` + `null` and `exceptional` + (`Inactivo` | `null`): return `kind: 'unchanged'` with `existingMember` untouched.

#### 5. `src/features/batches/utils/memberMerge.ts` (Create)
*   **Type / Scope**: Pure TypeScript merge deduplication utility.
*   **Proposed Changes**:
    *   Export `BatchMemberSourceEntry = { batch: Batch; members: ScoutMember[] }`, `CrossIdentityCodeConflict = { code: string; members: ScoutMember[] }`, `MergedMembersResolution = { survivingMembers: ScoutMember[]; duplicateCount: number; allSourceDocIds: Set<string>; crossIdentityCodeConflicts: CrossIdentityCodeConflict[] }`, `deduplicateMergedMembers(entries: BatchMemberSourceEntry[], options?: { targetBatchId?: number; targetUserId?: string }): MergedMembersResolution`, and `findCrossIdentityCodeConflicts(members: ScoutMember[]): CrossIdentityCodeConflict[]`.
    *   Group non-generic members by `normalizeCedula(member.identity)` while preserving the winner's original `member.identity`; keep every generic-identity member intact (appending `_2`, `_3` suffixes to `first_names` or doc-ID disambiguator only when two generic survivors would map to the same `newDocId`).
    *   Rank duplicates by status (`active: 3 > exceptional: 2 > pending: 1`, unknown/`undefined` -> `0`), then valid `sourceBatch.created_at` descending (`NaN` -> `0`), then numeric `sourceBatch.id` descending (`b.id - a.id`).
    *   Retain winner's `recognition_code` when non-empty; otherwise inherit from the highest-ranked loser with `loser.status === winner.status`.
    *   Backfill missing/`NaN` `group_id` from winner's `sourceBatch.group_id ?? 0`; stamp `batch_id` / `user_id` only when `options.targetBatchId` / `options.targetUserId` are supplied (allowing `MergeBatchesModal` to call `deduplicateMergedMembers(entries)` with zero dummy batch IDs).
    *   Collect `allSourceDocIds` (`Set<string>`) computed via `getMemberDocId` using `member.batch_id ?? sourceBatch.id`.

#### 6. Phase 1 Unit Tests (Create / Modify)
*   `src/features/batches/utils/__tests__/memberIdentity.test.ts` (Create): test `isGenericIdentity`, `getMemberDocId`, `hasInvalidDocPathChars`, `normalizeCedula` (`"V-12.345.678"`, `"E-12345678"`, `"12345678"`, `"EXT-001"`, `"S/C"`), and `isSameIdentity`.
*   `src/features/batches/utils/__tests__/codeGenerator.test.ts` (Modify): test `inferBatchCodeMode` (explicit `code_mode`, legacy auto, legacy manual, all-pending, legacy 4-digit/`EXC` exceptional), `generateUniqueRecognitionCode`, and `validateManualRecognitionCode`.
*   `src/features/batches/utils/__tests__/scraperVerificationPool.test.ts` (Create): test empty items, probe-first fail-fast, 4-worker concurrency, `shouldAbort` circuit breaker, `isCancelled` unmount stop, `onProgress`, `isReverifiableMember`, and every row of `applyReverificationResult` (including legacy `V-` identity preservation, stale-field omission, and `pending` + `Inactivo` no-op equality).
*   `src/features/batches/utils/__tests__/memberMerge.test.ts` (Create): test status priority, `undefined` status rank `0`, `created_at` and numeric `batch.id` tie-breaks, same-tier code inheritance, winner original `identity` preservation, generic-identity collision suffixing, `allSourceDocIds`, and `findCrossIdentityCodeConflicts`.
*   **Phase 1 Checkpoint**: `npm run lint && npm run build && npx vitest run src/features/batches/utils/__tests__/`

---

### Phase 2: Firestore CRUD, Deterministic Merge & `MergeBatchesModal`

#### 7. `src/features/batches/api/membersCrud.ts` (Modify)
*   **Type / Scope**: Firestore CRUD and session-cache module.
*   **Proposed Changes**:
    *   Re-export `isGenericIdentity` and `getMemberDocId` from `../utils/memberIdentity` so existing imports remain unbroken.
    *   Import `writeBatch` from `firebase/firestore` (or reuse `commitChunkedBatches` from `./batchesCrud`) and `normalizeCedula` from `../utils/memberIdentity`.
    *   Add private `legacyDocIdByCanonicalKey = createKeyedSessionCache<string, string>()` populated on `getDocs` whenever `docSnapshot.id !== getMemberDocId(member)` (automatically cleared by `clearAllSessionCaches()`), keeping `ScoutMember` pure.
    *   Remove dead `deleteMember`, `removeMemberFromCache`, and `matchesDeletedMember`. Add internal `removeDocIdsFromCache(docIds: Set<string>): void` filtering `membersByUserCache` and `coldMembersByBatchCache` by exact `getMemberDocId(m)`.
    *   Export `deleteBatchMember(member: ScoutMember): Promise<void>`: resolves actual Firestore doc ID (checking `legacyDocIdByCanonicalKey` fallback to `getMemberDocId(member)`), executes `deleteDoc`, clears any legacy map entry, and calls `removeDocIdsFromCache`.
    *   Export `MemberUpdateEntry = { previous?: ScoutMember; next: ScoutMember }` and `saveBatchMemberUpdates(updates: MemberUpdateEntry[], userId?: string, chunkSize = 450): Promise<ScoutMember[]>`: sanitizes each `next`, computes `oldDocId` (via legacy map or `getMemberDocId(previous)`) and `newDocId = getMemberDocId(sanitized)`, queues `batch.set(newRef, sanitized)` and (when `oldDocId && oldDocId !== newDocId`) `batch.delete(oldRef)`, commits via `commitChunkedBatches`, evicts removed `oldDocId`s from caches, and calls `upsertMembersInCache`.
    *   Update `deduplicateBatchMembers`, `finalizedIdentities`, and `filterUniqueDraftMembers` to key non-generic members by `normalizeCedula(m.identity)` and preserve all generic (`S/C`) rows without deduplicating them.

#### 8. `src/features/batches/api/batchesCrud.ts` (Modify)
*   **Type / Scope**: Firestore batch CRUD and merge module.
*   **Proposed Changes**:
    *   Conditionally spread `...(params.code_mode ? { code_mode: params.code_mode } : {})` in `buildBatchRecord` and preserve/update `code_mode` in `updateBatch` (never writing `undefined` to Firestore).
    *   In `mergeBatches`: deduplicate `params.batchIds` via `Array.from(new Set(batchIds))` before checking `< 2`; fetch `membersByBatch` **before** calling `buildMergedBatchRecord`; compute `mergedCodeMode` via `inferBatchCodeMode` per source batch (shared mode if all agree, else `'manual'`); pass `mergedCodeMode` to `buildMergedBatchRecord`.
    *   Call `deduplicateMergedMembers(membersByBatch, { targetBatchId: newNumericId, targetUserId })`. Build `survivingDocIds = new Set(survivingMembers.map(getMemberDocId))`. Queue `set` ops (`batches/{newNumericId}` + 1 `set` per survivor) and `delete` ops (every `oldDocId` in `allSourceDocIds` where `!survivingDocIds.has(oldDocId)` + every original `batches/{id}`).
    *   If total ops `<= 450`, commit in a single `WriteBatch`; if `> 450`, commit all `set` chunks first via `commitChunkedBatches(createOps)` and then all `delete` chunks via `commitChunkedBatches(deleteOps)`. Update warm session caches with `survivingMembers` only.

#### 9. `src/features/batches/components/BatchList.tsx` & `src/features/batches/components/list/MergeBatchesModal.tsx` (Modify)
*   **Type / Scope**: Batch list and merge modal components.
*   **Proposed Changes**:
    *   In `BatchList.tsx`: hoist `membersByBatchId` into its own `useMemo` (without modifying `BatchRowData`) and pass `members: membersByBatchId.get(row.id) ?? []` on each `BatchMergeOption` (0 extra Firestore reads).
    *   In `MergeBatchesModal.tsx`: add optional `members?: ScoutMember[]` on `BatchMergeOption` (falling back to `b.memberCount` when omitted). When `members` arrays are present, compute preview via `deduplicateMergedMembers` and display `"<K> miembros únicos"` plus `"(<D> duplicados consolidados)"` when `duplicateCount > 0`. Render a non-blocking amber warning panel listing any `crossIdentityCodeConflicts` (`"Advertencia: <X> código(s) manual(es) repetido(s) entre miembros distintos"`).

#### 10. Phase 2 Unit & Component Tests (Modify)
*   `src/features/batches/api/__tests__/api.test.ts` (Modify): migrate legacy `deleteMember` tests to `deleteBatchMember` (exact doc-ID Firestore delete + exact cache eviction without wiping other `S/C` members + legacy non-canonical doc-ID cleanup); test `saveBatchMemberUpdates` (single & batch doc-ID migration + cache swap); test `deduplicateBatchMembers` keeping distinct identities with matching manual codes and normalizing `V-` drafts; test `Batch.code_mode` persistence on `createBatchWithMembers` / `mergeBatches`; test deterministic `mergeBatches` order independence, duplicate `batchIds` rejection, and `> 450` op create-before-delete chunking.
*   `src/features/batches/components/list/__tests__/MergeBatchesModal.test.tsx` (Modify): update existing `mockBatches` / `'8 miembros'` expectation for `<K> miembros únicos`, and add tests for consolidated duplicate count and non-blocking cross-identity duplicate-code warning.
*   **Phase 2 Checkpoint**: `npm run lint && npm run build && npx vitest run src/features/batches/api/__tests__/api.test.ts src/features/batches/components/list/__tests__/MergeBatchesModal.test.tsx`

---

### Phase 3: Shared Modals, Session Guard Hook & Wizard Integration

#### 11. `src/features/batches/components/shared/ScraperAlertModals.tsx` (Create), `src/features/batches/components/wizard/ScraperAlertModals.tsx` (Delete), `src/features/batches/components/shared/index.ts` & `src/features/batches/components/wizard/index.ts` (Modify)
*   **Type / Scope**: Shared feature modal relocation.
*   **Proposed Changes**: Move `ScraperAlertModals` into `components/shared/ScraperAlertModals.tsx`, delete `components/wizard/ScraperAlertModals.tsx`, export from `components/shared/index.ts`, and update imports in `NewBatchWizard.tsx` and wizard tests (`wizard/index.ts` drops the old re-export).

#### 12. `src/features/batches/hooks/useScraperSessionGuard.ts` (Create)
*   **Type / Scope**: Shared feature hook (~30 lines).
*   **Proposed Changes**: Encapsulates `ScraperSettingsContext` (`sessionStatus`, `refreshSessionStatus`, `setSessionStatus`), `ensureActiveSession()`, `handleScraperSessionFailure(err)`, and `alertModalProps` (`showAuthAlert`, `onCloseAuthAlert`, `authError`, `onCloseAuthError`) shared by `NewBatchWizard` and `BatchDetail`.

#### 13. `src/features/batches/components/shared/EditMemberModal.tsx` (Modify)
*   **Type / Scope**: Shared synchronous member edit modal (`Step2ReviewConfirm` and `BatchDetail`).
*   **Proposed Changes**:
    *   Extend `EditMemberModalProps` with `lifecycle?: 'draft' | 'emitted'` (default `'draft'`), `batchCodeMode?: BatchCodeMode` (default `'auto'`), `existingIdentities?: string[]`, and `existingCodes?: string[]`. No async scraper callbacks.
    *   Key `EditMemberForm` by `getMemberDocId(member)`.
    *   In `lifecycle === 'emitted'`:
        *   Render `Cédula` `Field`: `disabled` with Spanish lock hint when `member.status === 'active' && member.unit !== 'no_scout'`; editable for `pending`, `exceptional`, and `no_scout`. Validate non-empty/non-generic for Scouts (allowing `S/C` only for `no_scout`), reject `'/'`, and reject duplicates in `existingIdentities` (normalized). Persist `normalizeCedula(input)` for Scouts and trimmed input for `no_scout`.
        *   Lock the `Scout <-> no_scout` unit boundary (`no_scout` stays `no_scout`; Scout units omit `'no_scout'`), closing the `computeNextMemberUnitState` loophole.
        *   Lock `recognition_code` when `Boolean(member.recognition_code?.trim())`. While `status === 'pending'`, disable `recognition_code`. When promoting `pending -> exceptional`: in `'auto'` mode, generate a unique 6-character-suffix code via `generateUniqueRecognitionCode(existingCodes)` and keep it locked; in `'manual'` mode, unlock `recognition_code` for one-time entry validated via `validateManualRecognitionCode`. Fix unchecking before save to clear the unsaved code back to `''`.
        *   Lock the `exceptional` checkbox when saved `member.status === 'exceptional' && Boolean(member.recognition_code?.trim())`.
    *   In `lifecycle === 'draft'`, preserve `Step2ReviewConfirm` behavior while upgrading `getExceptionalRecognitionCode` to `generateUniqueRecognitionCode(existingCodes)` in `'auto'` mode.
    *   Replace `window.alert` validation with `Field` (`variant={error ? 'error' : 'default'}` + `errorText`) and `<ErrorAlert variant="compact" />`.

#### 14. `src/features/batches/components/wizard/wizardHelpers.ts`, `Step2ReviewConfirm.tsx`, & `NewBatchWizard.tsx` (Modify)
*   **Type / Scope**: Batch wizard components and helper re-exports.
*   **Proposed Changes**:
    *   In `wizardHelpers.ts`: re-export `InitialMemberHierarchy`, `buildUnregisteredMemberRecord`, and `buildScrapedMemberRecord` from `../../utils/scraperVerificationPool` (removing duplicate implementations).
    *   In `NewBatchWizard.tsx`: lift `codeMode` state (`useState<BatchCodeMode>('auto')`), pass `codeMode` and `onCodeModeChange` to `Step2ReviewConfirm`, skip `assignBatchRecognitionCodes(combined, 'auto')` when `codeMode === 'manual'`, refactor `onSubmitStep1` to use `runVerificationPool` and `useScraperSessionGuard`, and persist `code_mode: effectiveCodeMode` (`codeMode === 'manual' || hasNonAutoCode ? 'manual' : 'auto'`) in `handleFinalizeBatch`.
    *   In `Step2ReviewConfirm.tsx`: consume controlled `codeMode` / `onCodeModeChange`, flip `codeMode` to `'manual'` in `handleInlineCodeChange` (when non-auto code entered) and `handleClearCodes`, preserve already-assigned codes in `handleSaveEditedMember`, and pass `batchCodeMode={codeMode}` and `existingCodes` to `EditMemberModal`.

#### 15. Phase 3 Component Tests (Modify)
*   `src/features/batches/components/shared/__tests__/SharedModals.test.tsx` (Modify): update lines 226 & 240 (`window.alert` -> inline `ErrorAlert`/`Field` error; `REC-5678` -> 6-character `AUTO_CODE_PATTERN`), and add tests for `EditMemberModal` `lifecycle="emitted"` lock matrix (Scout `active`, `no_scout` `active`, `exceptional` locked checkbox/code, `pending -> exceptional` in `auto`/`manual`, `Scout <-> no_scout` unit boundary, inline duplicate/`/`/`S/C` validation).
*   `src/features/batches/components/__tests__/Step2ReviewConfirm.test.tsx` & `src/features/batches/components/__tests__/NewBatchWizard.test.tsx` (Modify): test `codeMode` preservation across Step 1 <-> Step 2 navigation, `'manual'` flip on inline code edit and clear-codes, `code_mode` persistence on `createBatchWithMembers`, and `runVerificationPool` / `useScraperSessionGuard` integration.
*   **Phase 3 Checkpoint**: `npm run lint && npm run build && npx vitest run src/features/batches/components/shared/__tests__/SharedModals.test.tsx src/features/batches/components/__tests__/Step2ReviewConfirm.test.tsx src/features/batches/components/__tests__/NewBatchWizard.test.tsx src/features/batches/components/__tests__/NewBatchWizardErrors.test.tsx src/features/batches/components/__tests__/NewBatchWizardFull.test.tsx`

---

### Phase 4: `BatchDetail` Post-Emission Lifecycle UI & Re-Verification

#### 16. `src/features/batches/hooks/useBatchReverification.ts` (Create)
*   **Type / Scope**: Focused `BatchDetail` re-verification hook.
*   **Proposed Changes**:
    *   Consumes `batch`, `members`, `userId`, `onMembersChanged`, `triggerToast`, and `useScraperSessionGuard`.
    *   Computes `batchCodeMode` (`inferBatchCodeMode(members, batch)`) and `reverifiableMembers` (`members.filter(isReverifiableMember)`).
    *   Exposes `isReverifying`, `reverifyProgress`, `stagedManualItems`, `stagedSessionExpiredNotice`, `handleReverifyAll()`, `handleReverifySingle(member)`, `handleConfirmManualCodes(assignedCodesByDocId)`, and `handleCancelManualCodes()`.
    *   Uses local `cancelledRef` on unmount to stop dequeuing and state updates.
    *   Inside `verifyItem`: calls `getMemberStatus(normalizeCedula(member.identity))`; maps `errStr.includes('No registrado')` to `null`, rethrows `ScraperSessionError` (triggering `shouldAbort`), and counts other transient network errors without aborting the pool.
    *   Commits code-free `refreshedPending` updates immediately via `saveBatchMemberUpdates`.
    *   In `'auto'` mode: generates unique 6-character-suffix codes (`generateUniqueRecognitionCode`, excluding `previousCode`) and commits `newlyActive` via `saveBatchMemberUpdates`; opens `ScraperAlertModals` only if `sessionError` occurred.
    *   In `'manual'` mode: if `newlyActive.length > 0`, opens `ManualCodeAssignmentModal` alone (passing `existingCodes` minus staged members' own `previousCode`s, while keeping each row's `previousCode` in `excludedCodes`); if `sessionError` also occurred mid-run, marks `ScraperSettingsContext` `'expired'` and sets `stagedSessionExpiredNotice = true` (inline amber note inside the modal; no stacked modal). Opens `ScraperAlertModals` only when `ManualCodeAssignmentModal` is not opened.
    *   Displays Spanish warning toast (`variant: 'warning'`) reminding operators to re-download the updated PDF whenever any `exceptional` member transitions to `active`, and reports any transient network error count.

#### 17. `src/features/batches/components/detail/ManualCodeAssignmentModal.tsx` (Create)
*   **Type / Scope**: Batch detail modal for two-phase manual-code re-verification.
*   **Proposed Changes**:
    *   Props: `isOpen`, `items: Array<{ previous: ScoutMember; member: ScoutMember; previousCode?: string }>`, `existingCodes: string[]`, `sessionExpiredMidRun?: boolean`, `saving: boolean`, `onCancel: () => void`, `onConfirm: (assignedCodesByDocId: Record<string, string>) => Promise<void>`.
    *   Displays optional amber inline notice when `sessionExpiredMidRun` is `true` instructing the operator to reconnect Impeesa after saving these codes.
    *   Renders each newly-active member's name, cédula, prior exceptional code badge (if any, `"Código anterior no reutilizable"`), and uppercase code `Field` (`variant={error ? 'error' : 'default'}` + `errorText`) validated via `validateManualRecognitionCode` against `existingCodes`, row's `previousCode`, and other modal inputs.

#### 18. `src/features/batches/components/detail/DeleteMemberModal.tsx` (Create)
*   **Type / Scope**: Batch detail confirmation modal.
*   **Proposed Changes**:
    *   Props: `isOpen`, `member: ScoutMember | null`, `deleting: boolean`, `onClose: () => void`, `onConfirm: () => void | Promise<void>`.
    *   Mirrors `DeleteBatchModal` layout with `<Button variant="destructive">`, member name, cédula, `<MemberStatusBadge />`, and an amber warning box when `member.recognition_code` is non-empty: `"Este miembro ya tiene un código de reconocimiento emitido (${member.recognition_code}). Eliminarlo retirará este registro del lote permanentemente."`.

#### 19. `src/features/batches/components/detail/AddSingleMemberCard.tsx` (Create)
*   **Type / Scope**: Batch detail bottom-of-page card component.
*   **Proposed Changes**:
    *   Props: `batch: Batch`, `userId?: string`, `batchCodeMode: BatchCodeMode`, `existingIdentities: string[]`, `existingCodes: string[]`, `groups: ScoutGroup[]`, `onVerifyCedula: (normalizedCedula: string) => Promise<{ status: 'found'; details: ScraperMemberDetails } | { status: 'not_found' } | { status: 'aborted' } | { status: 'error'; message: string }>`, `onAddMember: (member: ScoutMember) => Promise<void>`, `disabled?: boolean`.
    *   Step 1: `Field` (`variant={error ? 'error' : 'default'}` + `errorText`) + **"Verificar en Impeesa"** button + Spanish helper note (*"Para agregar varios miembros a la vez, crea un nuevo lote y fusiónalo desde el listado."*). Rejects empty, generic (`isGenericIdentity`), `'/'`, and duplicate normalized cédulas inline; clears any active preview immediately when input changes; disables controls while in-flight.
    *   Step 2: Inline preview panel showing name (`"Usuario No Registrado"` on `'not_found'`), `<MemberStatusBadge />`, resolved group/unit, and either pre-generated `REC-XXXXXX` (`auto`) / validated `Field` (`manual`) when `Activo`, or an amber warning (no code, `pending`) when `Inactivo` / `'not_found'`.
    *   Step 3: **"Agregar al lote"** constructs the record (`buildScrapedMemberRecord` or `buildUnregisteredMemberRecord(normalizedCedula, 'young', 'tropa', batch.id, userId, { region_id: 0, district_id: 0, group_id: 0 })`), re-validates code uniqueness, invokes `onAddMember`, and resets form state.

#### 20. `src/features/batches/components/detail/types.ts`, `batchDetailColumns.tsx`, `BatchMembersTable.tsx`, & `index.ts` (Modify)
*   **Type / Scope**: Batch detail subcomponents and barrel (`batchDetailTour.ts` unchanged).
*   **Proposed Changes**:
    *   `types.ts`: extend `MemberActionsCellProps` with `handleReverifySingleMember`, `handleDeleteMemberClick`, `canDeleteMembers: boolean`, and `isReverifying: boolean`.
    *   `batchDetailColumns.tsx`: key row menus by `getMemberDocId(rowData)`; close menu (`setActiveMenuMemberId(null)`) when clicking any action; add **"Re-verificar en Impeesa"** (visible when `isReverifiableMember(rowData)` is `true`; disabled while `isReverifying`) and **"Eliminar miembro"** (disabled with tooltip `"No se puede eliminar el último miembro del lote. Elimina el lote completo si deseas vaciarlo."` when `!canDeleteMembers || isReverifying`); disable **"Editar"** while `isReverifying`.
    *   `BatchMembersTable.tsx`: add optional `reverifiableCount?: number`, `isReverifying?: boolean`, `reverifyProgress?: { current: number; total: number } | null`, and `onReverifyAll?: () => void`; render **"Re-verificar (N)"** outline button next to `SearchInput` when `reverifiableCount > 0`, showing `"Verificando X de N..."` while `isReverifying` is `true`.
    *   `index.ts`: export `ManualCodeAssignmentModal`, `DeleteMemberModal`, and `AddSingleMemberCard`.

#### 21. `src/features/batches/components/BatchDetail.tsx` (Modify)
*   **Type / Scope**: Batch detail page component.
*   **Proposed Changes**:
    *   Extend `triggerToast(msg: string, durationMs = 3000, variant: ToastVariant = 'success')` and pass `variant={toastVariant}` to `<Toast />`.
    *   Wire `useBatchReverification` and `useScraperSessionGuard`; disable `DeleteBatchModal` trigger and `AddSingleMemberCard` while `isReverifying` is `true`.
    *   Keep simple 1-call handlers directly in `BatchDetail.tsx`:
        *   `handleSaveMemberEdit`: calls `saveBatchMemberUpdates([{ previous: editingMember, next: stampedNext }], targetUserId)` (retaining `window.alert('Error al actualizar la información del miembro.')` on Firestore failure for compatibility with existing test contracts) and updates `viewingMember` if open.
        *   `handleConfirmDeleteMember`: guards `members.length > 1`, calls `deleteBatchMember`, clears `activeMenuMemberId` / `viewingMember` if targeting the deleted member, and refreshes `members`.
        *   `handleVerifySingleAddCedula` & `handleAddSingleMember`: checks session via `useScraperSessionGuard`, maps `getMemberStatus` errors to the 4-branch discriminated union, and persists via `createMember` stamped with `batch_id: batch.id` and `user_id: batch.user_id ?? user?.uid`.
    *   Pass `autoResetPageIndex: false` to `useReactTable` and add a `useEffect` clamping `pageIndex` to `Math.max(0, Math.ceil(filteredMembers.length / pageSize) - 1)` when `filteredMembers.length` shrinks.
    *   Pass `lifecycle="emitted"`, `batchCodeMode`, `existingIdentities` (excluding `editingMember` by `getMemberDocId`), and `existingCodes` (excluding `editingMember` by `getMemberDocId`) to `EditMemberModal`; mount `AddSingleMemberCard`, `ManualCodeAssignmentModal`, `DeleteMemberModal`, and `ScraperAlertModals`.

#### 22. Phase 4 Component Tests (Modify)
*   `src/features/batches/components/__tests__/BatchDetail.test.tsx` (Modify):
    *   Update `vi.mock('../../api')` (lines 9–23) to spread `...(await vi.importActual('../../api'))` (or mock all newly imported exports) and mock `ScraperSettingsContext` (`useScraperSettings`).
    *   Update the existing active-member edit test (lines 531–546) to reflect locked `recognition_code` and locked Scout `active` `identity` in `lifecycle="emitted"`.
    *   Add tests for single & batch-wide re-verification (`auto` immediate commit and `manual` `ManualCodeAssignmentModal` two-phase commit rejecting previous exceptional code + mid-run expiry inline note), warning toast on `exceptional -> active`, `DeleteMemberModal` confirmation & `members.length === 1` disabled guard, `AddSingleMemberCard` 2-step flow (`found`, `not_found`, `aborted`, `error`), and pagination clamping after delete.
*   **Phase 4 Checkpoint**: `npm run lint && npm run build && npx vitest run src/features/batches/components/__tests__/BatchDetail.test.tsx`

---

### Phase 5: Feature Documentation Blueprints & Full Regression Verification

#### 23. Feature Documentation Blueprints (Modify)
Update exports, invariants, and side effects across all affected `batches` blueprints (per [AGENTS.md](../../AGENTS.md)):
*   `src/features/batches/README.md`
*   `src/features/batches/api/README.md`
*   `src/features/batches/components/README.md`
*   `src/features/batches/components/detail/README.md`
*   `src/features/batches/components/list/README.md`
*   `src/features/batches/components/shared/README.md`
*   `src/features/batches/components/wizard/README.md`
*   `src/features/batches/hooks/README.md`
*   `src/features/batches/types/README.md`
*   `src/features/batches/utils/README.md`

### Verification Plan

*   **Static Analysis & Linting**: `npm run lint` (0 errors, 0 warnings across `**/*.{ts,tsx}`).
*   **Compilation / Production Build**: `npm run build` (`tsc && vite build`, 0 TypeScript or bundle errors).
*   **Full Regression Suite**: `npm test -- --run` (all unit and component tests across `src/`, `functions/__tests__/`, and `scraper-api/__tests__/` must pass).
*   **Manual End-to-End Verification Checklist**:
    1.  Re-verify a batch containing `pending` (`"Usuario No Registrado"`) and `exceptional` members in both an `auto`-code batch and a `manual`-code batch; confirm `ManualCodeAssignmentModal` blocks reusing the previous exceptional code and that confirming updates `BatchDetail`'s summary and territorial cards.
    2.  Correct a mistyped cédula on a `pending` member and on an `active` `no_scout` member in `EditMemberModal`; verify Firestore contains only the migrated document ID and no duplicate appears after page reload, then re-verify the corrected `pending` Scout via the row action.
    3.  Confirm `Cédula` is read-only for Scout `active` members, `unit` cannot cross the `Scout <-> no_scout` boundary post-emission, and `Eliminar miembro` is disabled when 1 member remains.
    4.  Add one missing Scout via `AddSingleMemberCard` (both `Activo` and `No registrado`) and verify immediate table, summary card, territorial card, and export bucket updates.
    5.  Merge an older `pending` batch with a newer `active` batch sharing a cédula (testing both selection orders) and verify the `active` record wins deterministically and `MergeBatchesModal` shows the exact deduplicated count and cross-identity code warnings.

--------------------------------------------------------------------------------

<!-- Provenance: Indicates initial structural drafting via EGM. -->

*Drafted with EGM*
