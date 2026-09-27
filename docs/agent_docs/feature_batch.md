# Feature Context: Batch Management & PDF Generation

This document details the backend architecture, Firestore collections, service logic, and API wrapper interface for the **Módulo de Nuevo Lote**.

---

## 1. High-Level Purpose & Domain Logic

The **Batch (Lote)** represents a formal submission of cached scout membership records back to the national Scout Association registry. It groups members of a specific geographic Scout Group (or multiple groups in multi-group mode) for verification and bulk registration.

*   **Hierarchy Resolution & Multi-Group**: Scout organization data is structured relationally as: `Region` -> `District` -> `ScoutGroup`. The application supports single-group batches or **Multigrupo** batches (`group_id: 0`, or `region_id: 0` / `district_id: 0` for mixed geographic scopes), allowing individual members to carry their own specific `region_id`, `district_id`, and `group_id`.
*   **Batch Isolation & Merge**: Creating a batch creates a new document in the `batches` collection. Active members are linked to the batch by setting their `batch_id` attribute. Multiple existing batches can be consolidated using `mergeBatches`, which preserves the newest creation date, consolidates comments, reassigns all members, and removes obsolete source batches.
*   **Relational Reporting & Certificates**:
    * Tabular batch report (`generateBatchReport`): Aggregates batch and member records into an A4 printable PDF using `jsPDF`.
    * Batch diplomas archive (`generateBatchCertificatesPdf`): Compresses individual member PDF certificates into a `.zip` archive via `JSZip` (`Reconocimientos_Lote_<batchId>_<slug>.zip`).

---

## 2. Firestore Collections & Models

Our data is stored in the following collections:

### 1. `batches` Collection
*   **Document ID**: Numeric ID as a string (e.g. `"728145"`).
*   **Schema**:
    ```typescript
    interface Batch {
      id: number;
      comment?: string;
      region_id: number;     // 0 for Mixto / Multigrupo
      district_id: number;   // 0 for Mixto / Multigrupo
      group_id: number;      // 0 for Multigrupo
      recognition_type?: string;
      recognition_duration?: string;
      created_at: string;    // ISO Timestamp
    }
    ```

### 2. `scout_members` Collection
*   **Document ID**: Keyed by the unique national ID (`identity` / cédula) to support safe upserts.
*   **Schema**:
    ```typescript
    interface ScoutMember {
      identity: string;      // Document ID (strictly numeric)
      first_names: string;
      last_names: string;
      status: 'active' | 'pending';
      member_type: 'young' | 'adult';
      region_id?: number;    // Optional individual override
      district_id?: number;  // Optional individual override
      group_id?: number;     // Optional individual override
      recognition_code?: string;
      batch_id: number;      // References Batch.id
    }
    ```

### 3. Firestore Hierarchy collections
*   Region, District, and Group structures are resolved via parallel queries to Firestore collections (`regions`, `districts`, `groups`) with automatic client-side seeding on empty database status to keep layout collections manageable. Complete coverage includes Aragua, Anzoátegui, and all national regions.

---

## 3. API Service Layer (`src/features/batches/api/index.ts`)

All database queries and Cloud Functions triggers are wrapped in the feature's API file:

### Firestore SDK Operations
*   `createBatch(params) -> Promise<Batch>`: Adds a new batch document with cryptographically secure numeric ID.
*   `updateBatch(id, params) -> Promise<Batch>`: Updates an existing batch document.
*   `mergeBatches(params, userId?) -> Promise<Batch>`: Consolidates 2 or more batches into a new batch with latest timestamp and unified comment.
*   `deleteBatch(batchId) -> Promise<void>`: Atomically deletes a batch and all its associated members.
*   `createMember(member) / updateMember(member) -> Promise<ScoutMember>`: Performs safe Firestore upserts using the member's `identity` as the document path.
*   `getMembersByBatchId(batchId) -> Promise<ScoutMember[]>`: Queries `scout_members` filtering by `batch_id == batchId`.
*   `getAllBatches() -> Promise<Batch[]>`: Retrieves all batches, sorted by creation date descending.
*   `getBatchById(id) -> Promise<Batch | null>`: Retrieves a single batch document.

### Cloud Functions triggers (HTTPS Callables)
*   `getMemberStatus(cedula) -> Promise<ScraperMemberDetails>`: Triggers the `getMemberStatus` Cloud Function, forwarding scraper credentials stored in LocalStorage.
*   `loginScraper() -> Promise<void>`: Triggers the `loginScraper` Cloud Function to authenticate scraper credentials.

### PDF & ZIP Export Services
*   `generateBatchReport(batchId) -> Promise<string>`: Aggregates details from the batch and all its members, builds A4 print pages with dynamic multi-page table wrapping, and prompts a local PDF download using `jsPDF`.
*   `generateBatchCertificatesPdf({ batch, members }) -> Promise<string>`: Generates individual diploma PDFs for each member and prompts a `.zip` archive download using `JSZip`.

---

## 4. Integration Tips

1.  **Cascading Selects**: Use the data tree returned by `getHierarchyData` in the frontend select components. In multi-group mode (`group_id: 0`), allow per-member selection of group or district in Step 2 and Step 3.
2.  **ZIP Certificate Downloads**: Batch recognition downloads generate a compressed ZIP archive of individual certificates rather than a single multi-page PDF, facilitating separate delivery to scouts.
