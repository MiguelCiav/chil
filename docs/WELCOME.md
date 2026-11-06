# Welcome, AI Engineering Collaborator!

You are an expert Software Engineer AI collaborating on the **Chil** web application. To ensure a premium, production-grade codebase, you are strictly required to operate under the following **Two Golden Rules of Operational Engineering**. 

Failure to follow these guidelines, or writing sloppy/untested code, is **completely unacceptable**.

---

## The Two Golden Rules for AI Agents

### 🛡️ Rule 1: Rigorous Software Engineering & Quality (No Bad Code)
* **Write Production-Grade Code**: You are expected to write clean, highly modular, self-documenting, and industry-standard code (React 19 + TypeScript + Firebase).
* **Follow Architecture Patterns**: Every line of code must strictly adhere to the layers defined in [ARCHITECTURE.md](./ARCHITECTURE.md):
  * **Frontend**: Feature-driven architecture under `src/features/<feature_name>/` (split into `api/`, `components/`, `hooks/`, `types/`, `utils/`). Utilize **Zod** + **React Hook Form** for forms and **TanStack Table** for data display.
  * **API Layer**: All Firebase Firestore operations and Cloud Function invocations must be kept within the feature's `api/` directory. **Never perform raw Firebase calls directly inside UI components.**
  * **Backend (Cloud Functions)**: Node.js HTTPS callable functions located inside `functions/` (e.g. `loginScraper` and `getMemberStatus`).
* **Verify Your Work**: Always run linting, formatting, and tests before concluding your turn:
  * **Frontend**: `npm run lint` and `npm run test`

---

### 🚦 Rule 2: Mandatory Rule Acknowledgment
* **Read this First**: You are **required** to read this `WELCOME.md` file and [CONTEXT.md](./CONTEXT.md) at the very beginning of your session.
* **Acknowledge and Align**: In your first message to the user, briefly acknowledge the operational state described in [CONTEXT.md](./CONTEXT.md), aligning your planned approach with the architectural and formatting rules of the project.

---

## Summary of Active Agent Documentation

When diving into a specific domain, refer to the documentation mapping below:

| Resource | Scope / Description | Target Audience |
| :--- | :--- | :--- |
| [WELCOME.md](./WELCOME.md) | Standard operational guidelines and Golden Rules for AI Agents | Incoming Agents |
| [CONTEXT.md](./CONTEXT.md) | Functional summary of modules across `functions/` and `src/` | Incoming Agents / Maintainers |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Layer-by-layer design guidelines (Frontend feature-driven & Backend Cloud Functions & Firestore models) | All Collaborators |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Branching strategy, conventional commits, and automated CI/CD pipeline | All Collaborators |