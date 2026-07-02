# Active Engineering Context: Chil

Welcome to the active developer context for **Chil**. This document serves as the live handover file between engineering agent sessions. Keep it concise, high-level, and accurate. 

> [!IMPORTANT]
> **DO NOT write micro-task checklists or commit lists here.** Keep this file focused on architectural milestones, schemas, interfaces, and design decisions.

---

## 1. Current Engineering State

* **Frontend (`src/`)**: 100% functional React 19 single-page-app with client-side routing under `react-router-dom`. Features a premium persistent layout, statistical dashboards, a cascading hierarchy selection form, and parallel scraping status checks.
* **Módulo de Nuevo Lote Wizard & Views (`src/features/batches`)**:
  * **Step 1 (Organización)**: Cascading selection logic for Regions, Districts, and Groups using static hierarchy data and premium button-based search modals. Form validation with Zod and React Hook Form.
  * **Step 2 (Miembros & Verificación)**: Bulk verification via parallel async scraper calls (`getMemberStatus`). Commits successful active scouts to Firestore (`scout_members` collection) and flags pending registrations.
  * **Step 3 (Revisión)**: Search filters, validation tab sorting, and manual edit modal allowing correction of member records.
  * **Pantalla de Éxito & Detalles**: KPI metrics dashboards, alert indicators for pending items, and client-side PDF report generation (`generateBatchReport`) using `jsPDF`.
* **Backend (`functions/` & `src/lib/firebase.ts`)**: Relies entirely on a serverless backend using Firebase Firestore, Cloud Functions, and Firebase Hosting. No local SQLite database connection or native desktop runner is used.
* **Test Coverage**: Frontend test coverage configured using `@vitest/coverage-v8` (Statements: ~74%), running on Vitest with exclusions configured to ignore the Cloud Functions subfolders.

---

## 2. Active Database Schema & Models

Our data is stored relationally inside **Firebase Firestore**:

```mermaid
erDiagram
    BATCH ||--o{ SCOUT_MEMBER : has
```

### Collections & Schema Structures

* **`batches`**: Group submissions to the registry. Document IDs match their generated numeric IDs.
  * `id`: `number` (Numeric ID)
  * `comment`: `string` (Optional)
  * `region_id`: `number`
  * `district_id`: `number`
  * `group_id`: `number`
  * `created_at`: `string` (ISO Timestamp)
* **`scout_members`**: Individual scout registrations. Document IDs are keyed by the unique national ID (`identity` / cédula).
  * `identity`: `string` (Unique Cédula)
  * `first_names`: `string`
  * `last_names`: `string`
  * `status`: `string` (`"active"` or `"pending"`)
  * `member_type`: `string` (`"young"` or `"adult"`)
  * `batch_id`: `number` (Reference to the parent `batch.id`)
* **Firestore Hierarchy Data**: Region, District, and Group information is fetched dynamically from Firestore collections (`regions`, `districts`, `groups`). The database is auto-seeded with static data on the very first load if these collections are empty.

---

## 3. Implemented API / Functions Surface

Below are the active Firebase endpoints exposed to the application:

### HTTPS Callable Cloud Functions
*   `loginScraper({ credentials }) -> Promise<{ success: true }>`: Authenticates cookie session for external scout registry.
*   `getMemberStatus({ cedula, credentials }) -> Promise<MemberDetails>`: Scrapes and returns member profile status from the registry.

### Firestore API Wrapper (`src/features/batches/api/index.ts`)
*   `getHierarchyData() -> Promise<HierarchyData>`: Queries Firestore collections with auto-seeding script fallback.
*   `createBatch(params) -> Promise<Batch>`: Inserts a new batch document into Firestore.
*   `getMembersByBatchId(batchId) -> Promise<ScoutMember[]>`: Queries members associated with a specific batch.
*   `getAllBatches() -> Promise<Batch[]>`: Retrieves all batches, sorted by creation date descending.
*   `createMember(member) / updateMember(member) -> Promise<ScoutMember>`: Performs safe upserts to Firestore using the member's `identity` as the document key.
*   `generateBatchReport(batchId) -> Promise<string>`: Generates a multi-page PDF batch report client-side using `jsPDF` and saves it.

---

## 4. Key Design Decisions

1.  **Scraper Session Caching**: The scraper cookie jar is cached in-memory inside the Node.js module context (`functions/scraper/auth.js`). Sessions are keyed by credentials to avoid repeating the login handshake.
2.  **Client-Side PDF Generation**: Replaced backend Rust PDF generation with `jsPDF` entirely on the frontend, removing binary compilation overhead and allowing direct browser file downloads.
3.  **Firestore Hierarchy Database**: Replaced static client-side JSON lookups with live Firestore collection queries (`regions`, `districts`, `groups`). Integrated self-healing client-side seeding on empty database status to keep layout collections manageable via the console.
4.  **UI Verification Purge**: Configured Step 2 verification list and Firestore sync to immediately hide and purge entries removed from input text fields, ensuring only currently visible records persist.
5.  **SonarQube Scan step**: Integrated static code analysis and test coverage metrics into the CI pipeline (via `@vitest/coverage-v8` lcov exports) to verify quality thresholds on every pull request.
4.  **Firestore Document ID Keys for Upserts**: In Firestore, `scout_members` are saved using their unique national ID (`identity`) as the Document ID. This ensures `createMember` and `updateMember` act as safe upserts rather than duplicating records or throwing index conflicts.

---

## 5. Next Architectural Milestones

1.  **Módulo de Reconocimientos (M4)**: Implement tracking for scout recognition awards, categories, and badge printing templates.
2.  **PDF Report Previews**: Introduce interactive PDF preview modals in the client-side UI before downloading files.
3.  **Expand Test Coverage**: Expand Vitest coverage across features to raise statement coverage above 80%.
