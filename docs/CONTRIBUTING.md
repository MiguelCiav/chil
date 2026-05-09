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

Before finishing the branch, you must document the impact of the change for versioning:

```bash
npx changeset
```

1. Select the affected package.
2. Define if it is a **patch** change (bugfix), **minor** (feature), or **major** (breaking change).
3. Write a short summary for `CHANGELOG.md`.

### Step 4: Pull Request and Merge

Upload your branch and open a PR on GitHub. Once approved and after passing the automatic tests, perform a **Squash Merge** to `main`.

---

## 4. Versioning and Releases

Versioning follows the **SemVer** standard (Major.Minor.Patch). In the current phase of initial development, we use the **0.x.y** series.

### To release a new version (in `main`):

1. **Update versions and files:**
```bash
npm run version-packages
```

*This consumes the files in the `.changeset` folder, updates `package.json`, `tauri.conf.json`, and generates `CHANGELOG.md`.*

2. **Release Commit:**
```bash
git add .
git commit -m "chore: release vX.Y.Z"
```

3. **Tag and Push:**
```bash
git tag vX.Y.Z
git push origin main --tags
```
