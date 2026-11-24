# Batch Wizard Components

## Overview
Step views, stepper, Zod schema, tour steps, and member persistence/parsing helpers for the `NewBatchWizard` batch creation flow (`ScraperAlertModals` moved to `../shared`).

## Interface
- `index.ts: *` (re-exports `./Step1DataLoad`, `./Step2ReviewConfirm`, `./WizardStepper`, `./wizardTour`, `./wizardSchema`, `./wizardHelpers`)
- `Step1DataLoad.tsx:Step1DataLoad`, `Step1DataLoad.tsx:Step1DataLoadProps`
- `Step2ReviewConfirm.tsx:Step2ReviewConfirm`, `Step2ReviewConfirm.tsx:Step2ReviewConfirmProps`
- `WizardStepper.tsx:WizardStepper`, `WizardStepper.tsx:WizardStepperProps`
- `wizardTour.ts:NEW_BATCH_WIZARD_TOUR_STEPS`
- `wizardSchema.ts:step1DataLoadSchema`, `wizardSchema.ts:Step1DataLoadFormData`, `wizardSchema.ts:step1Schema`
- `wizardHelpers.ts:parseCedulasFromText`, `wizardHelpers.ts:getStepCircleClasses`, `wizardHelpers.ts:InitialMemberHierarchy`, `wizardHelpers.ts:buildUnregisteredMemberRecord`, `wizardHelpers.ts:buildScrapedMemberRecord`, `wizardHelpers.ts:saveUnregisteredMemberToDb`, `wizardHelpers.ts:saveScrapedMemberToDb`, `wizardHelpers.ts:splitFullName`, `wizardHelpers.ts:matchHierarchy`, `wizardHelpers.ts:classifyScoutUnitAndType`

## Invariants
- `wizardSchema.ts:step1DataLoadSchema` requires a non-empty `recognitionType` and at least one numeric `cedula` parsed by `wizardHelpers.ts:parseCedulasFromText`.
- `Step1DataLoad.tsx:Step1DataLoad` uses `<Select>` and `<Field>`, renders a numeric-only cedulas placeholder, shows an empty recognition catalog alert when `!loadingHierarchy && recognitionTypes.length === 0`, and disables submission when `isVerifying || parsedCount === 0 || recognitionTypes.length === 0`.
- `WizardStepper.tsx:WizardStepper` renders step titles (`'Carga'` and `'Confirmación'`) without subtitle descriptions, only allows backward navigation (`item.step < currentStep`), and disables current/future step buttons.
- `Step2ReviewConfirm.tsx:Step2ReviewConfirm` accepts optional controlled `codeMode` / `onCodeModeChange` (defaulting to local state when uncontrolled), flips `codeMode` to `'manual'` on non-auto inline code edits and `handleClearCodes`, preserves already-assigned codes in `handleSaveEditedMember`, auto-assigns recognition codes via `useEffect` in `'auto'` mode, performs member edits/deletions/manual additions strictly in memory via `onMembersUpdated` (0 Firestore ops), and delegates deferred batch+member persistence to `onFinalizeBatch`.
- `wizardHelpers.ts` re-exports pure `InitialMemberHierarchy`, `buildUnregisteredMemberRecord`, and `buildScrapedMemberRecord` from `../../utils/scraperVerificationPool`; `saveUnregisteredMemberToDb` and `saveScrapedMemberToDb` wrap them for callers needing immediate `createMember` persistence.

## Side Effects
- `Step2ReviewConfirm.tsx:Step2ReviewConfirm` may invoke `window.confirm`, `window.alert`, or `console.error`, and delegates persistence to `onFinalizeBatch`.
- `wizardHelpers.ts` (`saveUnregisteredMemberToDb`, `saveScrapedMemberToDb`) writes via `createMember` when called directly.

## Verification
- Run: `npm test -- --run`
