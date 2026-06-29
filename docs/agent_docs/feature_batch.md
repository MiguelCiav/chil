# Feature Context: Batch Management & PDF Generation

This document details the backend architecture, Firestore collections, service logic, and API wrapper interface for the **Módulo de Nuevo Lote**.

---

## 1. High-Level Purpose & Domain Logic

The **Batch (Lote)** represents a formal submission of cached scout membership records back to the national Scout Association registry. It groups members of a specific geographic Scout Group for verification and bulk registration.

*   **Hierarchy Resolution**: Scout organization data is structured relationally as: `Region` -> `District` -> `ScoutGroup`. The application exposes a pre-structured hierarchy model so the frontend can populate cascading select fields instantly.
*   **Batch Isolation**: Creating a batch creates a new document in the `batches` collection. Active members are linked to the batch by setting their `batch_id` attribute.
*   **Relational Reporting**: Generating a batch report aggregates information across `batch`, `region`, `district`, `scout_group`, and `scout_member` collections to construct a multi-page, formatted PDF using `jsPDF` client-side.

---

## 2. Firestore Collections & Models

Our data is stored in the following collections:

### 1. `batches` Collection
*   **Document ID**: Numeric ID as a string (e.g. `"728145"`).
*   **Schema**:
    ```typescript
    interface Batch {
      id: number;
      name: string;
      region_id: number;
      district_id: number;
      group_id: number;
      created_at: string; // ISO Timestamp
    }
    ```

### 2. `scout_members` Collection
*   **Document ID**: Keyed by the unique national ID (`identity` / cédula) to support safe upserts.
*   **Schema**:
    ```typescript
    interface ScoutMember {
      identity: string;      // Document ID
      first_name: string;
      last_name: string;
      status: 'active' | 'pending';
      member_type: 'young' | 'adult';
      batch_id: number;      // References Batch.id
    }
    ```

### 3. Static Hierarchy
*   Region, District, and Group structures are resolved client-side from the static data tree in `src/features/batches/api/hierarchy.json` instead of querying Firestore, improving performance.

---

## 3. API Service Layer (`src/features/batches/api/index.ts`)

All database queries and Cloud Functions triggers are wrapped in the feature's API file:

### Firestore SDK Operations
*   `createBatch(params) -> Promise<Batch>`: Adds a new batch document.
*   `createMember(member) / updateMember(member) -> Promise<ScoutMember>`: Performs safe Firestore upserts using the member's `identity` as the document path.
*   `getMembersByBatchId(batchId) -> Promise<ScoutMember[]>`: Queries `scout_members` filtering by `batch_id == batchId`.
*   `getAllBatches() -> Promise<Batch[]>`: Retrieves all batches, sorted by creation date descending.
*   `getBatchById(id) -> Promise<Batch | null>`: Retrieves a single batch document.

### Cloud Functions triggers (HTTPS Callables)
*   `getMemberStatus(cedula) -> Promise<ScraperMemberDetails>`: Triggers the `getMemberStatus` Cloud Function, forwarding scraper credentials stored in LocalStorage.
*   `loginScraper() -> Promise<void>`: Triggers the `loginScraper` Cloud Function to authenticate scraper credentials.

### PDF Report Service
*   `generateBatchReport(batchId) -> Promise<string>`: Aggregates details from the batch and its members, builds A4 print pages with dynamic multi-page table wrapping, and prompts a local PDF download using `jsPDF`.

---

## 4. Integration Tips

1.  **Cascading Selects**: Use the data tree returned by `getHierarchyData` in the frontend select components. Maintain React state variables that filter districts based on the selected region, and groups based on the selected district.
2.  **PDF Report Downloads**: The report is generated directly in the browser and saved locally using `jsPDF`. The returned value from `generateBatchReport` is the file name of the downloaded PDF.
