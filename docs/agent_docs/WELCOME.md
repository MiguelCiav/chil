# Welcome, AI Engineering Collaborator!

You are an expert Software Engineer AI collaborating on the **Chil** desktop application. To ensure a premium, production-grade codebase, you are strictly required to operate under the following **Four Golden Rules of Operational Engineering**. 

Failure to follow these guidelines, or writing sloppy/untested code, is **completely unacceptable**.

---

## The Four Golden Rules for AI Agents

### 🛡️ Rule 1: Rigorous Software Engineering & Quality (No Bad Code)
* **Write Production-Grade Code**: You are expected to write clean, highly modular, self-documenting, and industry-standard code (React 19 + TypeScript + Tauri v2 + Rust).
* **Follow Architecture Patterns**: Every line of code must strictly adhere to the layers defined in [ARCHITECTURE.md](file:///home/miguel-ciavato/Documents/github-repos/chil/ARCHITECTURE.md):
  * **Frontend**: Feature-driven architecture under `src/features/<feature_name>/` (split into `api/`, `components/`, `hooks/`, `types/`, `utils/`). Utilize **Zod** + **React Hook Form** for forms and **TanStack Table** for data display.
  * **Backend**: Strict separation of concerns:
    * **Database Layer (`db/`)**: SeaORM entities isolated under `db/entities/`.
    * **Service Layer (`services/`)**: Core business logic decoupled from Tauri commands and state, enabling 100% database-mockable testing.
    * **Command Layer (`commands/`)**: Thin controller wrappers mapping Tauri IPC calls to the service layer.
* **Verify Your Work**: Always run linting, formatting, and tests before concluding your turn:
  * **Frontend**: `npm run lint` and `npm run test`
  * **Backend**: `cargo clippy -- -D warnings` and `cargo test`

---

### 🔍 Rule 2: High-Level Context Awareness & Feature Deep-Dives
* **Understand the Conventions**: At the start of any session, read the core general documentation to understand the project structure, technology stacks, branch naming conventions, and commit formatting standards:
  * [README.md](file:///home/miguel-ciavato/Documents/github-repos/chil/README.md)
  * [ARCHITECTURE.md](file:///home/miguel-ciavato/Documents/github-repos/chil/ARCHITECTURE.md)
  * [CONTRIBUTING.md](file:///home/miguel-ciavato/Documents/github-repos/chil/docs/CONTRIBUTING.md)
* **Feature Context Files**: 
  * Avoid reading hundreds of lines of source code when high-level context can explain it. Look inside `docs/agent_docs/` for module-specific context files (e.g., `docs/agent_docs/feature_<name>.md`).
  * **Create Feature Contexts**: If you work on or modify a complex module (e.g. Member database CRUD, reqwest Venezuelan scout registry scraping, PDF generation logic), you must document it. Create a dedicated context markdown file in `docs/agent_docs/feature_<feature_name>.md` detailing:
    * High-level purpose & domain logic.
    * SeaORM schemas or state definitions.
    * IPC interfaces (TypeScript invoke names, input arguments, serialized response shapes).
    * Integration tips for subsequent agents.

---

### 📝 Rule 3: Keep Context and Documentation Updated (No Task Logs)
* **Maintain the Context File**: Read and update [docs/agent_docs/CONTEXT.md](file:///home/miguel-ciavato/Documents/github-repos/chil/docs/agent_docs/CONTEXT.md) when completing significant feature milestones.
* **Do NOT Bloat Context**: 
  * > [!WARNING]
  * > Do NOT dump raw task checklists, lists of files changed, git commit logs, or micro-steps into `docs/agent_docs/CONTEXT.md`. This will quickly bloat the file and overload the context window of future sessions.
  * Keep documentation focused on **architectural progression**, **active database models**, **active design decisions**, **known system constraints**, and **completed milestones**. Think of it as a living developer hand-off document, not a git log or chore tracker.

---

### 🚦 Rule 4: Mandatory Rule Acknowledgment
* **Read this First**: You are **required** to read this `WELCOME.md` file and `docs/agent_docs/CONTEXT.md` at the very beginning of your session.
* **Acknowledge and Align**: In your first message to the user, briefly acknowledge the operational state described in `docs/agent_docs/CONTEXT.md`, aligning your planned approach with the architectural and formatting rules of the project.

---

## Summary of Active Agent Documentation

When diving into a specific domain, refer to the documentation mapping below:

| Resource | Scope / Description | Target Audience |
| :--- | :--- | :--- |
| [WELCOME.md](file:///home/miguel-ciavato/Documents/github-repos/chil/docs/agent_docs/WELCOME.md) | Standard operational guidelines and Golden Rules for AI Agents | Incoming Agents |
| [CONTEXT.md](file:///home/miguel-ciavato/Documents/github-repos/chil/docs/agent_docs/CONTEXT.md) | High-level status of the engineering workspace, database schemas, and current milestones | Incoming Agents / Maintainers |
| [ARCHITECTURE.md](file:///home/miguel-ciavato/Documents/github-repos/chil/ARCHITECTURE.md) | Layer-by-layer design guidelines (Frontend feature-driven & Backend command-service-db models) | All Collaborators |
| [CONTRIBUTING.md](file:///home/miguel-ciavato/Documents/github-repos/chil/docs/CONTRIBUTING.md) | Branching strategy, conventional commits, changesets, and automated CI/CD releases | All Collaborators |