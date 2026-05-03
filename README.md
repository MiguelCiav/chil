# Chil ⚜️

Chil: A native desktop app (macOS, Win, Linux) built with Tauri, React, and Rust. It automates scout recognition workflows: batch PDF generation, member verification, and statistical tracking via SQLite. A fast, secure tool for cooperators to manage records and custom storage folders.

---

## 🚀 Key Features

*   **Member Verification**: Quickly check if a scout member has an active registration to authorize recognitions.
*   **Batch Generation**: Input Group, District, and Region data to generate multiple recognitions at once.
*   **PDF Export**: Export individual or batch recognitions directly to PDF format.
*   **Custom Storage**: Select specific folders to store and organize generated recognitions.
*   **Statistics & History**: Access a detailed table of generated recognitions for statistical analysis and record keeping.
*   **Distribution Tracking**: Maintain lists of members from the latest batch to facilitate delivery to scout leaders.

---

## 🛠️ Tech Stack

### Frontend
*   **Framework**: React with Vite
*   **Language**: TypeScript
*   **Styling**: TailwindCSS & Shadcn/ui
*   **Navigation**: React Router
*   **Data Handling**: TanStack Table & React Hook Form
*   **Validation**: Zod
*   **Icons**: Lucide React

### Backend (Native)
*   **Core**: Tauri (Rust)
*   **Database**: SQLite
*   **ORM**: SeaORM

---

## 🧪 DevOps & Quality

*   **Testing**:
    *   **Frontend**: Vitest & React Testing Library.
    *   **Backend**: Native Rust tests with SeaORM Mocking.
    *   **E2E**: Playwright for cross-platform flow validation.
*   **CI/CD**: GitHub Actions for automated linting, testing, and multi-platform builds.
*   **Workflow**: GitHub Flow (main + feature branches) with **Conventional Commits**.
*   **Versioning**: Automatic SemVer and Changelog generation via **Changesets**.
