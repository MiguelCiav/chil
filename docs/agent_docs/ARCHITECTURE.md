# Chil Architectural Guidelines

This document details the architectural standards and design patterns for the **Chil** web application. Both AI agents and human developers must follow these patterns to ensure consistency, testability, security, and maintainability across the codebase.

---

## 1. High-Level Architecture Overview

Chil is a modern web application built on **React 19**, **TypeScript**, and **Firebase** (Firestore, Functions, Hosting).

```
+-------------------------------------------------------------+
|                      React Frontend                         |
|  (UI Pages, Features, Client-side Forms & Tables, Routes)   |
|  Uses Firebase SDK client to directly query Firestore       |
+-------------------------------------------------------------+
                                |
                    HTTPS / Firebase SDK protocols
                                |
        +-----------------------+-----------------------+
        |                                               |
        v                                               v
+-------------------------------+               +---------------+
|    Firebase Cloud Functions   |               |Cloud Firestore|
|    (Scraper, Node.js runtime) |               |  (Database)   |
+-------------------------------+               +---------------+
```

---

## 2. Frontend Architecture (Feature-Driven React)

The React frontend at `src/` is organized around a **Feature-Driven Architecture**. Instead of separating code by technical role (e.g., placing all hooks in one folder, all components in another), codebase items are grouped by business domain features.

### Directory Layout under `src/features/<feature_name>/`
We use `src/features/batches/` as the standard boilerplate model:

```
src/features/batches/
├── api/             # API Bridge functions (queries/mutations to Firestore & Cloud Functions)
├── components/      # UI components specific to this feature
├── hooks/           # Custom React hooks (React Hook Form, TanStack table wrapper hooks, query hooks)
├── types/           # TypeScript interfaces, types, and Zod validation schemas
└── utils/           # Utility functions (date formatting, calculations specific to the feature)
```

### Feature Guidelines
* **Isolation**: Features should be as self-contained as possible. Avoid importing internal components or utilities directly from another feature. If a component is needed in multiple features, hoist it to `src/components/` or standard utilities to `src/lib/`.
* **State Management**: Form validation should be done using **Zod** schemas in `types/` combined with **React Hook Form** inside `hooks/` or `components/`.
* **Data Displays**: Tables displaying records must use **TanStack Table (`@tanstack/react-table`)** to ensure clean sorting, filtering, and pagination support.
* **API Client Standard**: All Firebase operations (Firestore SDK queries, Cloud Function triggers) must be kept within the feature's `api/` directory. **Never perform raw Firestore reads/writes or trigger Functions directly in the UI components.**

  *Example (`src/features/batches/api/index.ts`)*:
  ```typescript
  import { doc, setDoc } from 'firebase/firestore';
  import { db } from '../../../lib/firebase';
  import { Batch, BatchCreationParams } from '../types';

  export async function createBatch(params: BatchCreationParams): Promise<Batch> {
    const numericId = Math.floor(Math.random() * 1000000) + 1;
    const newBatch: Batch = {
      id: numericId,
      name: params.name,
      region_id: params.region_id,
      district_id: params.district_id,
      group_id: params.group_id,
      created_at: new Date().toISOString()
    };

    await setDoc(doc(db, "batches", String(numericId)), newBatch);
    return newBatch;
  }
  ```

---

## 3. Backend Architecture (Cloud Functions)

The backend code is located inside the `functions/` directory, structured as a standard Node.js project:

```
functions/
├── index.js           # Cloud Functions entrypoint (exports HTTPS callable functions)
├── package.json       # Backend dependencies (firebase-functions, firebase-admin, axios, cheerio)
└── node_modules/      # Installed Node packages
```

### 3.1. Cloud Functions Guidelines
* **Functions Scope**: Keep Cloud Functions focused on operations that require server-side security, credentials masking, or scraping external resources (e.g. `loginScraper` and `getMemberStatus`).
* **Scraper cookie persistence**: Session cookies are held in-memory and mapped to credentials keys to prevent repeating the login handshake on every member verification request.
* **Error Handling standard**: Catch expected errors (e.g. "No registrado", network errors) and rethrow them using `HttpsError` from `firebase-functions/v2/https` with appropriate HTTP status codes (e.g., `not-found`, `unauthenticated`, `internal`).

---

## 4. Error Handling Standard

To handle errors robustly across the application:
1. **Cloud Function Errors**: Map runtime errors to `HttpsError` exceptions at the function boundary.
2. **API Layer**: Wrap Firebase SDK promises in `try-catch` blocks inside the feature `api/` files, mapping raw errors to user-friendly messages.
3. **UI Display**: Form inputs and scraper statuses display errors using React Hook Form's validation feedback or dedicated UI state boundaries.

---

## 5. Security, Rules & Indexes

All data security and query requirements are defined via Firebase configuration files:
* **`firestore.rules`**: Controls read/write permissions for Firestore collections based on authentication status and user roles.
* **`firestore.indexes.json`**: Configures single-field and composite indexes required for complex queries (e.g., querying `scout_members` by `batch_id`).
