# Batch Wizard Components

## Overview
Step views, stepper, Zod schema, tour steps, scraper alert modals, and member persistence/parsing helpers for the `NewBatchWizard` batch creation flow.

## Interface
- `index.ts: *` (re-exports `./Step1DataLoad`, `./Step2ReviewConfirm`, `./WizardStepper`, `./ScraperAlertModals`, `./wizardTour`, `./wizardSchema`, `./wizardHelpers`)
- `Step1DataLoad.tsx:Step1DataLoad`, `Step1DataLoad.tsx:Step1DataLoadProps`
- `Step2ReviewConfirm.tsx:Step2ReviewConfirm`, `Step2ReviewConfirm.tsx:Step2ReviewConfirmProps`
- `WizardStepper.tsx:WizardStepper`, `WizardStepper.tsx:WizardStepperProps`
- `ScraperAlertModals.tsx:ScraperAlertModals`, `ScraperAlertModals.tsx:ScraperAlertModalsProps`
- `wizardTour.ts:NEW_BATCH_WIZARD_TOUR_STEPS`
- `wizardSchema.ts:step1DataLoadSchema`, `wizardSchema.ts:Step1DataLoadFormData`, `wizardSchema.ts:step1Schema`, `wizardSchema.ts:Step1FormData`
- `wizardHelpers.ts:parseCedulasFromText`, `wizardHelpers.ts:getStepCircleClasses`, `wizardHelpers.ts:InitialMemberHierarchy`, `wizardHelpers.ts:saveUnregisteredMemberToDb`, `wizardHelpers.ts:saveScrapedMemberToDb`, `wizardHelpers.ts:splitFullName`, `wizardHelpers.ts:matchHierarchy`, `wizardHelpers.ts:classifyScoutUnitAndType`

## Invariants
- `wizardSchema.ts:step1DataLoadSchema` requires a non-empty `recognitionType` and at least one numeric `cedula` parsed by `wizardHelpers.ts:parseCedulasFromText`.
- `Step1DataLoad.tsx:Step1DataLoad` uses `<Select>` and `<Field>`, renders a numeric-only cedulas placeholder, shows an empty recognition catalog alert when `!loadingHierarchy && recognitionTypes.length === 0`, and disables submission when `isVerifying || parsedCount === 0 || recognitionTypes.length === 0`.
- `WizardStepper.tsx:WizardStepper` renders step titles (`'Carga'` and `'Confirmación'`) without subtitle descriptions, only allows backward navigation (`item.step < currentStep`), and disables current/future step buttons.
- `Step2ReviewConfirm.tsx:Step2ReviewConfirm` renders `<SearchInput size="sm">`, `<DataTable bordered={false}>` with a single emptyState, and `<MemberStatusBadge />` (with `solvent_until` for active members), auto-assigns recognition codes on mount when `codeMode === 'auto'` and any `active` or `exceptional` member lacks a `recognition_code`, persists members on finalize via `batchUpdateMembers` (falling back to per-member `updateMember` only when mocked without `batchUpdateMembers` in tests), and `Step2ReviewConfirm.tsx:handleSaveManualMember` reloads `getMembersByBatchId(batchId)` (re-applying `auto` codes if `codeMode === 'auto'`) rather than calling `createMember` directly.
- `ScraperAlertModals.tsx:ScraperAlertModals` renders session error details inside `<ErrorAlert variant="compact">` (`role="alert"`).
- `wizardHelpers.ts:saveUnregisteredMemberToDb` and `wizardHelpers.ts:saveScrapedMemberToDb` return `null` without calling `createMember` if `batchId` is falsy, and persist explicit numeric `0` (`?? 0`) for unset `region_id`, `district_id`, and `group_id` fields; `Step2ReviewConfirm.tsx:Step2ReviewConfirm` passes `batchId` as the 3rd argument to `deleteMember`.

## Side Effects
- `ScraperAlertModals.tsx:ScraperAlertModals` invokes `openModal()` from `ScraperSettingsContext` to open the shared Impeesa session settings modal.
- `wizardHelpers.ts` (`saveUnregisteredMemberToDb`, `saveScrapedMemberToDb`) and `Step2ReviewConfirm.tsx:Step2ReviewConfirm` mutate and reload backend member records via `createMember`, `updateMember`, `batchUpdateMembers`, `deleteMember`, and `getMembersByBatchId` from `../../api`, and may invoke `window.confirm`, `window.alert`, or `console.error`.

## Verification
- Run: `npm test`
