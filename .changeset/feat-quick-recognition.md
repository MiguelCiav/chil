---
"chil": minor
---

Implement Quick Recognition Emission, Age-Based Unit Inference, and UI Polish:
- **Navbar "Emisión Rápida" Shading**:
  - Applied warm amber styling to the "Emisión Rápida" NavLink (`bg-amber-100/70` inactive with hover effects, `bg-amber-200/90` active).
- **Empty Recognition Types Handling in New Batch Wizard**:
  - In `Step1Org.tsx`: Added warning card when no recognition types exist (*"No tienes tipos de reconocimientos registrados. Debes crear al menos un tipo de reconocimiento en el Catálogo antes de crear un nuevo lote."*) with a direct action button to `/reconocimientos`.
  - In `NewBatchWizard.tsx`: Disabled "Siguiente paso" button when recognition types are empty.
- **Emoji Removal & Consistent Scout Unit Labels**:
  - Cleaned all emojis across `SCOUT_UNITS`, selectors, badges, and navigation headers.
  - Standardized unit labels: `Manada`, `Tropa`, `Caminantes`, `Clan`, `Institucional`, `No scout`, and `Mixto (Todas las unidades)`.
- **Step 2 & Step 3 Unit Handling & Age-Based Inference**:
  - In `Step2Verification.tsx`: Removed `UNIDAD` column from the verification table to keep verification focused on cédulas, names, and status.
  - Created `unitInference.ts` with `calculateAge`, `inferYouthUnitByAge`, and `inferBatchMemberUnits` to automatically deduce units by birth date (<11 -> Manada, 11-15 -> Tropa, 16-18 -> Caminantes, 19-21 -> Clan, >21 / adults -> mode of batch youth units or Institucional).
  - Applied inferred units upon transition from Step 2 to Step 3 and enabled manual unit overriding in Step 3 review modal.
- **Quick Recognition Success Screen UI**:
  - Replaced gradient headers with a clean, solid background aesthetic (`bg-primary/5` with subtle borders and neutral typography).
- **Quality Gate & Testing**:
  - Added unit test suite `unitInference.test.ts` and updated all existing test suites.
  - 100% test pass rate across 46 test suites (369 tests), 0 ESLint warnings/errors, and 0 TypeScript build errors.
