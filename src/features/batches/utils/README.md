# Batches Utils

## Overview
Pure utility functions for the `batches` feature that handle recognition code generation, Scout hierarchy matching and unit classification from Impeesa scraped data, full-name splitting, and batch-level unit inference and filtering.

## Interface
- [codeGenerator.ts:generateRecognitionCode] Generates a random alphanumeric recognition code with a cleaned uppercase prefix.
- [codeGenerator.ts:assignBatchRecognitionCodes] Assigns unique recognition codes in `'auto'` mode (or clears them in `'manual'` mode) across a `ScoutMember[]` batch.
- [hierarchyMatcher.ts:MatchedHierarchy] Interface representing matched region, district, and group IDs and names.
- [hierarchyMatcher.ts:normalizeScoutName] Normalizes strings by uppercasing, stripping diacritics/punctuation, and collapsing whitespace.
- [hierarchyMatcher.ts:matchHierarchy] Maps raw region, district, and group strings/UUIDs to canonical `hierarchy.json` entries.
- [hierarchyMatcher.ts:classifyScoutUnitAndType] Classifies a scraped member record into `{ unit: ScoutUnit; member_type: 'young' | 'adult' }`.
- [nameHelper.ts:splitFullName] Splits a full name string into `{ first_names, last_names }`.
- [unitInference.ts:filterStep2MembersByHierarchy] Filters members to those whose `district_id` belongs to `regionDistricts`.
- [unitInference.ts:YouthScoutUnit] Union type `'manada' | 'tropa' | 'caminantes' | 'clan'`.
- [unitInference.ts:parseBirthDate] Parses `'YYYY-MM-DD'`, `'DD/MM/YYYY'`, `'DD-MM-YYYY'`, or ISO birth date strings into `Date | null`.
- [unitInference.ts:calculateAge] Computes whole-year age from a birth date string.
- [unitInference.ts:inferYouthUnitByAge] Maps a numeric age (or `null`) to a `ScoutUnit`.
- [unitInference.ts:inferUnitByAge] Alias for `inferYouthUnitByAge`.
- [unitInference.ts:InferredUnitResult] Result type `{ inferredUnit?: ScoutUnit; isAdultCandidate: boolean }`.
- [unitInference.ts:resolveMemberYouthUnitOrAdult] Determines whether a `ScoutMember` is an adult candidate or has a direct youth unit.
- [unitInference.ts:computeBatchModeUnit] Computes the most frequent youth unit in a batch, returning `'institucional'` on ties or empty input.
- [unitInference.ts:inferMemberUnit] Resolves a single member's unit using existing assignment, adult candidacy, and batch mode unit.
- [unitInference.ts:inferBatchMemberUnits] Normalizes and infers units across a `ScoutMember[]` batch according to `unitScope` and batch mode rules.
- [batchTerritorial.ts:TerritorialTokenKind], [batchTerritorial.ts:TerritorialToken], [batchTerritorial.ts:CompletenessStatus], [batchTerritorial.ts:BatchTerritorialProjection], [batchTerritorial.ts:TerritorialBreakdownItem], [batchTerritorial.ts:BatchTerritorialBreakdown] Types for read-time batch territorial pills, completeness state, and `BatchDetail` breakdown.
- [batchTerritorial.ts:deriveBatchTerritorialProjection] Derives sorted `regionTokens`, `districtTokens`, `groupTokens`, `completenessStatus`, `completenessLabel`, `pendingCount`, and `memberCount` for a batch from its `ScoutMember[]` slice and `HierarchyLookup`.
- [batchTerritorial.ts:consolidateMergedGroupTokens] Consolidates `TerritorialToken[][]` across one or more batches into a comma-joined label (suppressing `'No aplica'` when positive or `'No scout'` tokens exist).
- [batchTerritorial.ts:calculateBatchTerritorialBreakdown] Computes count-sorted `regions`, `districts`, `groups`, `noScoutCount`/`noScoutPercentage`, `ungroupedScoutCount`/`ungroupedScoutPercentage`, and `totalMembers` for `BatchTerritorialCard`.

## Invariants
- [codeGenerator.ts:generateRecognitionCode] Uses `crypto.getRandomValues` over the 32-character alphabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (excluding ambiguous `0`, `O`, `1`, `I`) and formats `${cleanPrefix}-${hash}` with trimmed uppercase prefix defaulting to `'REC'`.
- [codeGenerator.ts:assignBatchRecognitionCodes] In `'auto'` mode, generates unique codes per batch only for members with `status === 'active'` or `status === 'exceptional'`, sets `''` for other statuses or `'manual'` mode, and returns new member objects without mutating inputs.
- [hierarchyMatcher.ts:matchHierarchy] Ignores `id === 0` placeholder entries in `hierarchy.json`, prioritizes exact UUID or normalized-name matches before substring matching, and preserves raw input strings when no canonical match is found.
- [hierarchyMatcher.ts:classifyScoutUnitAndType] Evaluates `'no_scout'` before adult/unit rules; treats role/type keywords or `edad >= 21` as `'adult'`; and respects explicit youth branch names even for adult leaders.
- [nameHelper.ts:splitFullName] Splits trimmed whitespace-delimited tokens deterministically by token count (`>= 4` -> 2 first names; `3` -> 1 first name; `2` -> 1 first name; `< 2` -> raw `name` as `first_names` and `''` as `last_names`).
- [unitInference.ts:inferYouthUnitByAge] Maps `null` -> `'tropa'`, `< 11` -> `'manada'`, `<= 15` -> `'tropa'`, `<= 18` -> `'caminantes'`, `<= 21` -> `'clan'`, and `> 21` -> `'institucional'`.
- [unitInference.ts:computeBatchModeUnit] Returns `'institucional'` when youth unit counts are tied or zero.
- [unitInference.ts:inferMemberUnit] Preserves any existing `member.unit` other than `'institucional'` before falling back to `batchModeUnit` (for adults) or `inferredUnit ?? member.unit ?? 'tropa'`.
- [unitInference.ts:inferBatchMemberUnits] Overrides all member units to `unitScope` when `unitScope` is set and not `'mixed'`, forces `status: 'active'` whenever the resulting unit is `'no_scout'`, and returns new member objects without mutating inputs.
- [batchTerritorial.ts:deriveBatchTerritorialProjection] Delegates per-member resolution to `src/utils/memberHierarchy.ts:resolveMemberHierarchy`; sorts positive ID tokens by `count` descending then `id` ascending; suppresses `'No aplica'` (`kind: 'none'`) in any column that has at least one positive ID or `'nacional'`/`'no_scout'` token; excludes `no_scout` members when computing mixed-batch territorial tokens unless all members are `no_scout`; and sets `completenessStatus` to `'empty'` (`0` members), `'pending'` (`pendingCount > 0`), or `'complete'`.
- [batchTerritorial.ts:calculateBatchTerritorialBreakdown] Computes all item percentages over `totalMembers` (`batchMembers.length`), attributes `isNationalInstitutional` members under `{ id: 'nacional', name: 'Nacional' }` in `regions`, and sorts breakdown items by `count` descending then Spanish `localeCompare`.

## Side Effects
- [codeGenerator.ts:generateRecognitionCode] Reads entropy from `crypto.getRandomValues`.

## Verification
- Run: `npm test`
