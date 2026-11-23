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
- `wizardSchema.ts:step1DataLoadSchema`, `wizardSchema.ts:Step1DataLoadFormData`, `wizardSchema.ts:step1Schema`
- `wizardHelpers.ts:parseCedulasFromText`, `wizardHelpers.ts:getStepCircleClasses`, `wizardHelpers.ts:InitialMemberHierarchy`, `wizardHelpers.ts:buildUnregisteredMemberRecord`, `wizardHelpers.ts:buildScrapedMemberRecord`, `wizardHelpers.ts:saveUnregisteredMemberToDb`, `wizardHelpers.ts:saveScrapedMemberToDb`, `wizardHelpers.ts:splitFullName`, `wizardHelpers.ts:matchHierarchy`, `wizardHelpers.ts:classifyScoutUnitAndType`

## Invariants
- `wizardSchema.ts:step1DataLoadSchema` requires a non-empty `recognitionType` and at least one numeric `cedula` parsed by `wizardHelpers.ts:parseCedulasFromText`.
- `Step1DataLoad.tsx:Step1DataLoad` uses `<Select>` and `<Field>`, renders a numeric-only cedulas placeholder, shows an empty recognition catalog alert when `!loadingHierarchy && recognitionTypes.length === 0`, and disables submission when `isVerifying || parsedCount === 0 || recognitionTypes.length === 0`.
- `WizardStepper.tsx:WizardStepper` renders step titles (`'Carga'` and `'Confirmación'`) without subtitle descriptions, only allows backward navigation (`item.step < currentStep`), and disables current/future step buttons.
- `Step2ReviewConfirm.tsx:Step2ReviewConfirm` accepts optional `batchId?: number | null`, renders `<SearchInput size="sm">`, `<DataTable bordered={false}>`, and `<MemberStatusBadge />`, auto-assigns recognition codes on mount when `codeMode === 'auto'`, performs member edits, deletions, and manual `"No Scout"` additions strictly in memory via `onMembersUpdated` (0 Firestore ops), and delegates deferred batch+member persistence to the async `onFinalizeBatch` prop.
- `ScraperAlertModals.tsx:ScraperAlertModals` renders session error details inside `<ErrorAlert variant="compact">` (`role="alert"`).
- `wizardHelpers.ts:buildUnregisteredMemberRecord` and `wizardHelpers.ts:buildScrapedMemberRecord` construct normalized `ScoutMember` records in memory without writing to Firestore; `saveUnregisteredMemberToDb` and `saveScrapedMemberToDb` wrap them for callers needing immediate `createMember` persistence.

## Side Effects
- `ScraperAlertModals.tsx:ScraperAlertModals` invokes `openModal()` from `ScraperSettingsContext` to open the shared Impeesa session settings modal.
- `Step2ReviewConfirm.tsx:Step2ReviewConfirm` may invoke `window.confirm`, `window.alert`, or `console.error`, and delegates persistence to `onFinalizeBatch`.
- `wizardHelpers.ts` (`saveUnregisteredMemberToDb`, `saveScrapedMemberToDb`) writes via `createMember` when called directly.

## Verification
- Run: `npm test`
