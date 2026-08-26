---
"chil": minor
---

Implement Quick Recognition Emission, Hierarchy Flexibility, Registry Safeguards, and UI Polish:
- **Navbar "Emisión Rápida" Button Contrast**:
  - Enhanced contrast and crispness for the "Emisión Rápida" NavLink (`bg-amber-100 hover:bg-amber-200 text-neutral-900 border border-amber-300 font-semibold`, and `bg-amber-300 text-neutral-950 border-amber-400 font-bold` when active).
- **"No aplica" Region and District Support**:
  - Added support for "No aplica" (id: 0) in Region, District, and Group across hierarchy data and selectors.
  - Selecting Region "No aplica" sets District and Group to "No aplica" / 0 and disables their dropdowns. Selecting District "No aplica" sets Group to "No aplica" / 0 and disables it.
  - Resolved "No aplica" / 0 to "-" or "No aplica" across diplomas, PDF generators, summaries, and batch reports.
- **Registry Consultation Enforcement in Quick Recognition**:
  - Enforced registry verification for Scout units prior to issuing recognitions, with clear validation message: *"Debe consultar el sistema de registro para verificar la cédula del scout antes de emitir el reconocimiento."*
- **Registry Safeguard on Unit Change in Step 3 & Batch Detail**:
  - Tracked `verified_in_registry` flag across member lifecycles. If an unverified member created under "No scout" is changed to a Scout unit in edit modals, status automatically switches to `pending` unless authorized as exceptional with a justification.
- **Optional Hierarchy for "No Scout" Batches & Quick Emissions**:
  - Region, District, and Group are optional and default to "No aplica" (0) when `unit_scope === 'no_scout'` or `unit === 'no_scout'`.
- **Dedicated Comments Card in Batch Detail**:
  - Cleaned main batch header title (`Lote #{batch.id}`) and added a dedicated "Comentarios / Observaciones" card displaying comment text or *"Sin observaciones registradas"*.
- **Justification for Exceptional Recognition Emission**:
  - Added required `exceptional_reason` field when authorizing exceptional diploma emissions.
  - Displayed exceptional justification in Quick View modals and included "Justificación Excepcional" column in Excel export.
- **Modularization & Component Architecture**:
  - Modularized `QuickRecognition.tsx` into `useQuickRecognition` custom hook, `QuickRecognitionSuccess`, `RecognitionFieldsSection`, and `RecipientFieldsSection`.
  - Modularized `BatchDetail.tsx` into `BatchSummaryCards`, `EditMemberModal`, `MemberQuickViewModal`, and `DeleteBatchModal`.
- **Testing & Quality Assurance**:
  - 100% test pass rate across 46 test suites (375 tests), 0 ESLint errors/warnings, and 0 TypeScript build errors.

