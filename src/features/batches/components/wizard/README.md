# Batch Wizard Components

## Overview
Step views, stepper, Zod schema, tour steps, scraper alert modals, and member persistence/parsing helpers for the `NewBatchWizard` batch creation flow.

## Interface
- `index.ts: *` (re-exports `./Step1DataLoad`, `./Step2ReviewConfirm`, `./Step2Verification`, `./Step3Review`, `./WizardStepper`, `./ScraperAlertModals`, `./wizardTour`, `./wizardSchema`, `./wizardHelpers`)
- `Step1DataLoad.tsx:Step1DataLoad`, `Step1DataLoad.tsx:Step1DataLoadProps`
- `Step2ReviewConfirm.tsx:Step2ReviewConfirm`, `Step2ReviewConfirm.tsx:Step2ReviewConfirmProps`
- `Step2Verification.tsx:Step2Verification`, `Step2Verification.tsx:Step2MemberColumnDef`
- `Step3Review.tsx:Step3Review`
- `WizardStepper.tsx:WizardStepper`, `WizardStepper.tsx:WizardStepperProps`
- `ScraperAlertModals.tsx:ScraperAlertModals`, `ScraperAlertModals.tsx:ScraperAlertModalsProps`
- `wizardTour.ts:NEW_BATCH_WIZARD_TOUR_STEPS`
- `wizardSchema.ts:step1DataLoadSchema`, `wizardSchema.ts:Step1DataLoadFormData`, `wizardSchema.ts:step1Schema`, `wizardSchema.ts:Step1FormData`
- `wizardHelpers.ts:parseCedulasFromText`, `wizardHelpers.ts:getStepCircleClasses`, `wizardHelpers.ts:handleScrapeErrorResult`, `wizardHelpers.ts:getInitialMemberUnit`, `wizardHelpers.ts:upsertVerificationItem`, `wizardHelpers.ts:parseCedulaEntries`, `wizardHelpers.ts:InitialMemberHierarchy`, `wizardHelpers.ts:saveNoScoutMemberToDb`, `wizardHelpers.ts:saveUnregisteredMemberToDb`, `wizardHelpers.ts:saveScrapedMemberToDb`, `wizardHelpers.ts:syncAndFinalizeStep2Members`, `wizardHelpers.ts:splitFullName`, `wizardHelpers.ts:matchHierarchy`, `wizardHelpers.ts:classifyScoutUnitAndType`

## Invariants
- `wizardSchema.ts:step1DataLoadSchema` requires a non-empty `recognitionType` and at least one numeric `cedula` parsed by `wizardHelpers.ts:parseCedulasFromText`.
- `WizardStepper.tsx:WizardStepper` only allows backward navigation (`item.step < currentStep`) and disables current/future step buttons.
- `Step2ReviewConfirm.tsx:Step2ReviewConfirm` and `Step3Review.tsx:Step3Review` auto-assign recognition codes on mount when `codeMode === 'auto'` and any `active` or `exceptional` member lacks a `recognition_code`.
- `wizardHelpers.ts:saveNoScoutMemberToDb`, `wizardHelpers.ts:saveUnregisteredMemberToDb`, and `wizardHelpers.ts:saveScrapedMemberToDb` return `null` without calling `createMember` if `batchId` is falsy, and persist explicit numeric `0` (`?? 0`) for unset `region_id`, `district_id`, and `group_id` fields; `Step2ReviewConfirm.tsx:Step2ReviewConfirm` and `wizardHelpers.ts:syncAndFinalizeStep2Members` pass `batchId` as the 3rd argument to `deleteMember`.

## Side Effects
- `Step1DataLoad.tsx:Step1DataLoad` reads uploaded `.csv`/`.txt` files via `FileReader`.
- `ScraperAlertModals.tsx:ScraperAlertModals` invokes `openModal()` from `ScraperSettingsContext` to open the shared Impeesa session settings modal.
- `wizardHelpers.ts` (`saveNoScoutMemberToDb`, `saveUnregisteredMemberToDb`, `saveScrapedMemberToDb`, `syncAndFinalizeStep2Members`), `Step2ReviewConfirm.tsx:Step2ReviewConfirm`, and `Step3Review.tsx:Step3Review` mutate and reload backend member records via `createMember`, `updateMember`, `batchUpdateMembers`, `deleteMember`, and `getMembersByBatchId` from `../../api`, and may invoke `window.confirm`, `window.alert`, `console.error`, or `console.warn` (`Step3Review.tsx` may also call `downloadSingleCertificatePdf`).

## Verification
- Run: `npm test`
