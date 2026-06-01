<p align="center">
  <img src="https://i.imgur.com/X2pGfSy.png" alt="Chil logo" width=200px />
</p>

# Chil

Chil is a native desktop application (macOS, Windows, Linux) built with Tauri, React, and Rust. It is designed to automate and streamline scout recognition workflows. By leveraging the performance of Rust and the flexibility of React, Chil provides a fast, secure, and user-friendly tool for cooperators to manage records, generate batch PDFs, and track statistical data via SQLite. It also allows users to quickly verify active registrations, generate bulk PDFs based on Group, District, and Region data, and maintain a robust history of generated documents—all within a secure, offline-first desktop environment.

---

## Prerequisites

To develop and run Chil locally, ensure you have the following installed:

### Required Software
- **[Node.js](https://nodejs.org/)**: v18 or higher (v20+ recommended).
- **[Rust & Cargo](https://rustup.rs/)**: The latest stable toolchain (`rustc`, `cargo`, `rustup`).

### OS-Specific Tauri Dependencies
Tauri requires system-level dependencies depending on your operating system:
- **Linux**: `webkit2gtk-4.1`, `build-essential`, `curl`, `wget`, `file`, `libssl-dev`, `libgtk-3-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`.
- **macOS**: Xcode Command Line Tools (`xcode-select --install`).
- **Windows**: Build Tools for Visual Studio 2022 (C++ build tools) and WebView2.

*For full details on environment setup, refer to the [Tauri Prerequisites Documentation](https://v2.tauri.app/start/prerequisites/).*

### Testing Dependencies (Linux Only)
For running native WebdriverIO E2E tests on Linux, you must install:
- `webkit2gtk-driver`
- `tauri-driver` (`cargo install tauri-driver --locked`)

---

## Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/MiguelCiav/chil.git
   cd chil
   ```

2. **Install Frontend Dependencies:**
   ```bash
   npm install
   ```

3. **Install Backend Dependencies (Cargo):**
   ```bash
   cd src-tauri
   cargo fetch
   cd ..
   ```

---

## Development Workflow

To start the application in development mode with Hot Module Replacement (HMR):

```bash
npm run tauri dev
```
This command starts the Vite development server for the React frontend and concurrently compiles/launches the Rust Tauri application.

---

## Testing and Quality Assurance

Chil is built with a rigorous, multi-layered testing and linting suite to ensure stability.

### 1. Frontend Testing (Vitest)
Runs unit and component tests for the React application using Vitest and React Testing Library.
```bash
npm run test
```

### 2. Backend Testing (Cargo & SeaORM)
Runs native Rust unit tests, including database logic isolated via SeaORM Mocks.
```bash
cd src-tauri
cargo test
```

### 3. End-to-End Testing (WebdriverIO + tauri-driver)
Validates cross-platform desktop flows using native WebDriver automation.
**Terminal 1:** Start the Tauri driver:
```bash
tauri-driver
```
**Terminal 2:** Run the test suite:
```bash
npx wdio run wdio.conf.ts
```

### 4. Linting
Maintains code quality and consistency across both languages.
- **Frontend (ESLint):** `npm run lint`
- **Backend (Cargo Clippy):** `cd src-tauri && cargo clippy`

### 5. Code Coverage Reports
You can run automated test coverage reports on both frontend and backend code:
- **Frontend Coverage (Vitest):** Run `npx vitest run --coverage`. Reports are generated under `coverage/`.
- **Backend Coverage (Rust):** Navigate to the backend directory `cd src-tauri` and run the executable coverage runner `./coverage.sh`. It checks dependencies and launches `cargo-llvm-cov` to print a terminal report, export LCOV files (`lcov.info`), or open interactive browser views (`./coverage.sh --open`).

---

## Building for Production

To generate a production-ready, optimized binary and installer for your current operating system:

```bash
npm run tauri build
```
The compiled binaries and installers (e.g., `.deb`, `.app`, `.exe`) will be located in `src-tauri/target/release/bundle/`.

---

## Project Stack

### Frontend
- **Framework**: React 19 + Vite
- **Language**: TypeScript
- **Styling**: TailwindCSS v4
- **State/Data Handling**: TanStack Table, React Hook Form
- **Validation**: Zod
- **Icons**: Lucide React

### Backend (Native)
- **Core**: Tauri v2 (Rust)
- **Database**: SQLite
- **ORM**: SeaORM & SQLx
- **Async Runtime**: Tokio

---

## Development Standards

Chil follows strict development standards to maintain a clean history and automated semantic versioning:
- **[Conventional Commits](https://www.conventionalcommits.org/)**: Enforced via `husky` and `@commitlint/config-conventional`.
- **[Changesets](https://github.com/changesets/changesets)**: Used for automated versioning and changelog generation. (Run `npm run create-changeset` before opening a PR).

For a detailed guide on our workflow, please read the **[Contributing Guide](docs/CONTRIBUTING.md)**.
