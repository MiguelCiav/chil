# Contribution Guide and Workflow

This document defines the technical standards and development process to ensure a clean Git history, automatic versioning, and a robust architecture.

## 1. Branching Strategy (GitHub Flow)

To protect the stability of the project, the `main` branch is protected and does not accept direct changes.

* **`main`**: Contains exclusively stable and production-ready code.
* **Feature branches (`feat/story-X`)**: For new features based on User Stories.
* **Fix branches (`fix/error-description`)**: To solve specific bugs.

### Golden Rules:

* Every change must go through a **Pull Request (PR)** before being integrated into `main`.
* The use of **Squash Merge** is recommended to maintain a linear and clean history in `main`.

---

## 2. Commit Standard (Conventional Commits)

We use the *Conventional Commits* standard to facilitate automatic generation of changelogs and version calculation.

### Structure: `<type>(scope): <description>`

* **`feat`**: A new feature (e.g., `feat(ui): add folder selector`).
* **`fix`**: A bug fix (e.g., `fix(db): solve unexpected closure`).
* **`docs`**: Changes in documentation.
* **`chore`**: Maintenance or configuration tasks (e.g., `chore: configure husky`).
* **`refactor`**: Code changes that do not add features or fix bugs.
* **`test`**: Add or fix unit tests.

> **Note:** If a change breaks backward compatibility, add a `!` after the type (e.g., `feat!: change in save format`).

---

## 3. Step-by-Step Development Process

### Step 1: Branch Creation

```bash
git checkout -b feat/story-X
```

### Step 2: Development and Commits

Make your changes following the commit standard. The system (Husky + Commitlint) will validate your messages automatically.

### Step 3: Change Registration (Changeset)

Before opening your Pull Request or merging, you must document the impact of your change for automated versioning:

```bash
npx changeset
```
*(Alternatively, you can run `npm run create-changeset`)*

1. Select the affected package (e.g., `chil`).
2. Define if it is a **patch** change (bugfix), **minor** (feature), or **major** (breaking change).
3. Write a short summary of changes for `CHANGELOG.md`.

### Step 4: Pull Request and Merge

1. Commit the generated changeset file in your feature branch:
   ```bash
   git add .changeset/
   git commit -m "chore: add changeset"
   ```
2. Upload your branch and open a PR on GitHub.
3. Once approved and after passing the automated CI checks, perform a **Squash Merge** to `main`. 

---

## 4. Automated Versioning and Releases

Versioning follows the **SemVer** standard (Major.Minor.Patch). In the current phase of initial development, we use the **0.x.y** series. 

The entire release process is fully automated via our **GitHub Actions CI/CD Pipeline**, eliminating manual versioning, changelog generation, manual tagging, or redundant CI runs.

### Release Workflow

The automated release workflow runs on every push or merge to the `main` branch:

```mermaid
graph TD
    A[Feature PR Merged into main] --> B[CI/CD: lint-and-test runs]
    B -->|Success & Upload Artifact| C{Are there outstanding changesets?}
    C -->|Yes| D[release-planner: Opens/Updates 'Version Packages' PR]
    D --> E[Maintainer Merges 'Version Packages' PR into main]
    E --> F[CI/CD: lint-and-test runs & uploads artifact]
    F --> G[release-planner: Tags repo & creates GitHub Release]
    G --> H[deploy: Downloads artifact & deploys to Firebase]
    C -->|No| H
```

1. **Feature PR Merge & "Version Packages" PR**:
   - When a feature branch with a changeset file is merged into `main`, the `release-planner` job creates or updates the **"Version Packages" Pull Request**.
   - **Zero CI Waste**: PRs from `changeset-release/*` skip `lint-and-test` automatically, avoiding duplicate tests or SonarQube scans.

2. **Publishing and Immediate Deployment**:
   - When the maintainer merges the **"Version Packages" PR** into `main`, `release-planner` detects no remaining changesets, tags the release (e.g., `v0.7.1`), and generates the GitHub Release.
   - The `deploy` job downloads the pre-built `dist` artifact and deploys directly to **Firebase Hosting** and **Firebase Cloud Functions** without recompiling.
