# Chil Architectural Guidelines

This document details the architectural standards and design patterns for the **Chil** desktop application. Both AI agents and human developers must follow these patterns to ensure consistency, testability, security, and maintainability across both frontend React code and backend Rust code.

---

## 1. High-Level Architecture Overview

Chil is an offline-first desktop application built on **Tauri v2**, joining a **React + Vite** frontend with a **Rust + SeaORM + SQLite** native backend.

```
+-------------------------------------------------------------+
|                      React Frontend                         |
|  (UI Pages, Features, Client-side Forms & Tables, Routes)    |
+-------------------------------------------------------------+
                               |
                   Tauri IPC (Bridge/Invokes)
                               |
                               v
+-------------------------------------------------------------+
|                      Tauri Command Layer                    |
|    (Thin wrappers, handles AppState extraction & locking)   |
+-------------------------------------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                     Rust Service Layer                      |
|       (Heavy business logic, PDF generation, IO)            |
+-------------------------------------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                       Database Layer                        |
|        (SeaORM ORM + SQLx driver + SQLite Database)         |
+-------------------------------------------------------------+
```

---

## 2. Frontend Architecture (Feature-Driven React)

The React frontend at `src/` is organized around a **Feature-Driven Architecture**. Instead of separating code by technical role (e.g., placing all hooks in one folder, all components in another), codebase items are grouped by business domain features.

### Directory Layout under `src/features/<feature_name>/`
We use `src/features/batches/` as the standard boilerplate model:

```
src/features/batches/
├── api/             # IPC Bridge functions (invokes to Rust commands)
├── components/      # UI components specific to this feature
├── hooks/           # Custom React hooks (React Hook Form, TanStack table wrapper hooks, query hooks)
├── types/           # TypeScript interfaces, types, and Zod validation schemas
└── utils/           # Utility functions (date formatting, calculations specific to the feature)
```

### Feature Guidelines
* **Isolation**: Features should be as self-contained as possible. Avoid importing internal components or utilities directly from another feature. If a component is needed in multiple features, hoist it to `src/components/` or standard utilities to `src/lib/`.
* **State Management**: Form validation should be done using **Zod** schemas in `types/` combined with **React Hook Form** inside `hooks/` or `components/`.
* **Data Displays**: Tables displaying records must use **TanStack Table (`@tanstack/react-table`)** to ensure clean sorting, filtering, and pagination support.
* **IPC Client Standard**: IPC invocations must be kept within the feature's `api/` directory using Tauri's `@tauri-apps/api/core/invoke`. **Never invoke Tauri commands directly in the UI components.**
  
  *Example (`src/features/batches/api/index.ts`)*:
  ```typescript
  import { invoke } from '@tauri-apps/api/core';
  import { Batch, BatchCreationParams } from '../types';

  export async function createBatch(params: BatchCreationParams): Promise<Batch> {
    return await invoke<Batch>('create_batch', { params });
  }
  ```

---

## 3. Backend Architecture (Rust)

The Rust backend is structured cleanly into three independent architectural layers to ensure strict separation of concerns, reliable testing, and high maintainability:


```
src-tauri/src/
├── db/                # Database Layer (entities, connection setup, migrations)
│   ├── entities/      # SeaORM generated entities (scout, batch, etc.)
│   └── mod.rs         # Database pool establishment
├── services/          # Pure Service Layer (business logic, PDF layout, bulk generation)
│   ├── pdf.rs
│   ├── recognitions.rs
│   └── mod.rs
├── commands/          # Tauri Controller Layer (IPC command controllers)
│   ├── batches.rs
│   ├── recognitions.rs
│   └── mod.rs
├── main.rs            # Entrypoint (initializes state, binds IPC commands)
└── models.rs          # Shared structs & AppState definitions
```

### 3.1. Database Layer (`src-tauri/src/db/`)
* Built on **SeaORM** (SQLite backend).
* **Entities**: Defined in `src-tauri/src/db/entities/`. All models should support serialization for the IPC bridge (`#[derive(Serialize, Deserialize)]`).
* **Migrations**: Handled automatically during app startup inside `establish_connection`.

### 3.2. Pure Service Layer (`src-tauri/src/db/services/`)
* **Crucial Rule**: Services must contain the core business logic and have **no dependencies** on Tauri state or Tauri-specific libraries.
* They should accept a reference to `&DatabaseConnection` (or a mock connection) and any primitive arguments, returning a native `Result<T, ServiceError>`.
* This makes services **100% testable** with SeaORM's native memory-based mock connections (`sea-orm::MockDatabase`).

### 3.3. Command / Controller Layer (`src-tauri/src/commands/`)
* Contains thin Tauri wrappers annotated with `#[tauri::command]`.
* **Single Responsibility**:
  1. Extract and lock the shared application state (`tauri::State<'_, AppState>`).
  2. Parse or deserialize arguments.
  3. Invoke the corresponding service layer function.
  4. Map service results and return a serialized JSON string or a type implementing `serde::Serialize` back across the IPC bridge.
  5. Map internal errors to a safe, user-friendly `String` error.

  *Example Command Controller Pattern (`src-tauri/src/commands/batches.rs`)*:
  ```rust
  use crate::models::AppState;
  use crate::services::batches;
  use crate::db::entities::batch::Model as Batch;

  #[tauri::command]
  pub async fn create_batch(
      state: tauri::State<'_, AppState>,
      name: String,
  ) -> Result<Batch, String> {
      // 1. Lock state
      let db = state.db.lock().await;
      
      // 2. Delegate to the Pure Service Layer
      batches::create_new_batch(&db, name)
          .await
          .map_err(|e| e.to_string())
  }
  ```

---

## 4. Error Handling Standard

To bridge the gap between Rust and TypeScript:
1. **Rust Errors**: Define custom domain-specific errors using crates like `thiserror` (e.g. `pub enum ServiceError`).
2. **IPC Boundary**: Convert complex Rust errors into strings (`.map_err(|e| e.to_string())`) or custom serializable error structs at the `#[tauri::command]` boundary.
3. **TypeScript Consumption**: Wrap IPC invokes in `try-catch` blocks within feature `api` components, propagating user-friendly error messages to form hooks or state components.

---

## 5. Backend Unit Testing Strategy

To maintain high software quality, every service layer file must have an adjacent or inline unit test suite using `sea-orm::MockDatabase`:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use sea_orm::MockDatabase;

    #[tokio::test]
    async fn test_create_new_batch() {
        // Prepare mock responses
        let db = MockDatabase::new(sea_orm::DatabaseBackend::Sqlite)
            .append_query_results([
                // Mock return records...
            ])
            .into_connection();

        // Run service function directly
        let result = create_new_batch(&db, "Spring Scout Camp 2026".into()).await;

        // Verify logic is correct
        assert!(result.is_ok());
    }
}
```

---

## 6. Security & Tauri Capabilities

All frontend actions are gated by Tauri's **capability profiles** located in `src-tauri/capabilities/`. 
When exposing a new command via `#[tauri::command]`, ensure it is explicitly added to the allowed permissions in `src-tauri/capabilities/default.json` so the frontend is permitted to execute it.
