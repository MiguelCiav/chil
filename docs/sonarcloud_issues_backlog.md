# 📋 SonarCloud Code Quality & Security Issues Backlog

This backlog tracks all **32 issues** identified by SonarCloud on branch `feat/new-batch` with their exact locations, severity, quality impacts, and remediation plans.

---

## 📊 Summary Overview

| Metric | Count | Details |
| :--- | :---: | :--- |
| **Total Issues** | **32** | 32 of 32 shown in SonarCloud |
| **Estimated Total Effort** | **2h 26min** | Remediation effort estimated by SonarCloud |
| **Security Issues** | **1** | Medium (PRNG in `createBatch`) — *Remediated* |
| **Reliability Issues** | **18** | Missing button `type`, ambiguous spacing, unassociated form labels |
| **Maintainability Issues** | **15** | Deprecated types, nested ternaries, inline component declarations |
| **Severity Breakdown** | — | **25 Medium** (Major Code Smells / Vulnerability) · **9 Low** (Minor Code Smells) |

---

## 📑 Detailed Issue Registry by File

### 1. `functions/handlers/getMemberStatus.js` (1 Issue)

| # | Line | Severity | Quality | Issue Description | Remediation Plan |
| :-: | :---: | :---: | :---: | :--- | :--- |
| 1 | **L34** | 🟡 Low (Minor) | Maintainability | `Prefer using an optional chain expression instead, as it's more concise and easier to read.` | Replace nested `&&` checks with optional chaining `?.` |

---

### 2. `functions/handlers/loginScraper.js` (1 Issue)

| # | Line | Severity | Quality | Issue Description | Remediation Plan |
| :-: | :---: | :---: | :---: | :--- | :--- |
| 2 | **L25** | 🟡 Low (Minor) | Maintainability | `Prefer using an optional chain expression instead, as it's more concise and easier to read.` | Replace nested `&&` checks with optional chaining `?.` |

---

### 3. `src/components/Navbar.tsx` (4 Issues)

| # | Line | Severity | Quality | Issue Description | Remediation Plan |
| :-: | :---: | :---: | :---: | :--- | :--- |
| 3 | **L34** | 🟡 Low (Minor) | Maintainability | `'FormEvent' is deprecated.` | Replace deprecated `React.FormEvent` with `React.SubmitEvent` or `React.FormEvent<HTMLFormElement>`. |
| 4 | **L83** | 🟠 Medium (Major) | Reliability | `Add an explicit "type" attribute to this button.` | Add `type="button"` to `<button>`. |
| 5 | **L86** | 🟠 Medium (Major) | Reliability | `Add an explicit "type" attribute to this button.` | Add `type="button"` to `<button>`. |
| 6 | **L97** | 🟠 Medium (Major) | Reliability | `Add an explicit "type" attribute to this button.` | Add `type="button"` to `<button>`. |

---

### 4. `src/components/SearchSelectorModal.tsx` (1 Issue)

| # | Line | Severity | Quality | Issue Description | Remediation Plan |
| :-: | :---: | :---: | :---: | :--- | :--- |
| 7 | **L18** | 🟡 Low (Minor) | Maintainability | `Mark the props of the component as read-only.` | Add `Readonly<SearchSelectorModalProps>` or `readonly` modifiers to prop types. |

---

### 5. `src/features/batches/api/__tests__/api.test.ts` (1 Issue)

| # | Line | Severity | Quality | Issue Description | Remediation Plan |
| :-: | :---: | :---: | :---: | :--- | :--- |
| 8 | **L245** | 🟡 Low (Minor) | Maintainability | `Prefer "expect(list).toHaveLength(1)" over this generic assertion for better reporting.` | Refactor `.toBe(1)` length assertion to `.toHaveLength(1)`. |

---

### 6. `src/features/batches/api/index.ts` (1 Issue)

| # | Line | Severity | Quality | Issue Description | Status |
| :-: | :---: | :---: | :---: | :--- | :---: |
| 9 | **L110** | 🟠 Medium (Major) | Security | `Make sure that using this pseudorandom number generator is safe here.` | ✅ **Fixed** in commit `778fb74` (replaced `Math.random()` with `crypto.getRandomValues`) |

---

### 7. `src/features/batches/components/BatchDetail.tsx` (4 Issues)

| # | Line | Severity | Quality | Issue Description | Remediation Plan |
| :-: | :---: | :---: | :---: | :--- | :--- |
| 10 | **L103** | 🟡 Low (Minor) | Maintainability | `'FormEvent' is deprecated.` | Replace deprecated type with standard event handler type for React 19. |
| 11 | **L330** | 🟠 Medium (Major) | Reliability | `Add an explicit "type" attribute to this button.` | Add `type="button"` to modal action button. |
| 12 | **L343** | 🟠 Medium (Major) | Reliability | `Add an explicit "type" attribute to this button.` | Add `type="button"` to tab button. |
| 13 | **L356** | 🟠 Medium (Major) | Reliability | `Add an explicit "type" attribute to this button.` | Add `type="button"` to tab button. |

---

### 8. `src/features/batches/components/NewBatchWizard.tsx` (1 Issue)

| # | Line | Severity | Quality | Issue Description | Remediation Plan |
| :-: | :---: | :---: | :---: | :--- | :--- |
| 14 | **L421** | 🟠 Medium (Major) | Reliability | `Add an explicit "type" attribute to this button.` | Add `type="button"` to step navigation/action button. |

---

### 9. `src/features/batches/components/SuccessPage.tsx` (2 Issues)

| # | Line | Severity | Quality | Issue Description | Remediation Plan |
| :-: | :---: | :---: | :---: | :--- | :--- |
| 15 | **L177** | 🟠 Medium (Major) | Reliability | `Add an explicit "type" attribute to this button.` | Add `type="button"` to action button. |
| 16 | **L279** | 🟠 Medium (Major) | Reliability | `Add an explicit "type" attribute to this button.` | Add `type="button"` to action button. |

---

### 10. `src/features/batches/components/wizard/Step1Org.tsx` (2 Issues)

| # | Line | Severity | Quality | Issue Description | Remediation Plan |
| :-: | :---: | :---: | :---: | :--- | :--- |
| 17 | **L107** | 🟠 Medium (Major) | Maintainability | `Extract this nested ternary operation into an independent statement.` | Refactor nested ternary into clear `if / else` variable or helper. |
| 18 | **L137** | 🟠 Medium (Major) | Maintainability | `Extract this nested ternary operation into an independent statement.` | Refactor nested ternary into clear `if / else` variable or helper. |

---

### 11. `src/features/batches/components/wizard/Step2Verification.tsx` (7 Issues)

| # | Line | Severity | Quality | Issue Description | Remediation Plan |
| :-: | :---: | :---: | :---: | :--- | :--- |
| 19 | **L55** | 🟠 Medium (Major) | Maintainability | `Move this component definition out of the parent component and pass data as props.` | Extract inline sub-component outside the main component render. |
| 20 | **L62** | 🟠 Medium (Major) | Maintainability | `Move this component definition out of the parent component and pass data as props.` | Extract inline sub-component outside the main component render. |
| 21 | **L69** | 🟠 Medium (Major) | Maintainability | `Move this component definition out of the parent component and pass data as props.` | Extract inline sub-component outside the main component render. |
| 22 | **L100** | 🟠 Medium (Major) | Reliability | `Add an explicit "type" attribute to this button.` | Add `type="button"`. |
| 23 | **L115** | 🟠 Medium (Major) | Maintainability | `Move this component definition out of the parent component and pass data as props.` | Extract inline sub-component outside the main component render. |
| 24 | **L120** | 🟠 Medium (Major) | Reliability | `Add an explicit "type" attribute to this button.` | Add `type="button"`. |
| 25 | **L130** | 🟠 Medium (Major) | Reliability | `Add an explicit "type" attribute to this button.` | Add `type="button"`. |

---

### 12. `src/features/batches/components/wizard/Step3Review.tsx` (7 Issues)

| # | Line | Severity | Quality | Issue Description | Remediation Plan |
| :-: | :---: | :---: | :---: | :--- | :--- |
| 26 | **L50** | 🟡 Low (Minor) | Maintainability | `'FormEvent' is deprecated.` | Replace deprecated form event type with standard React 19 handler type. |
| 27 | **L96** | 🟠 Medium (Major) | Reliability | `Add an explicit "type" attribute to this button.` | Add `type="button"`. |
| 28 | **L104** | 🟠 Medium (Major) | Reliability / Maintainability | `Ambiguous spacing before next element span` | Add explicit `{' '}` spacing or fix JSX inline whitespace formatting. |
| 29 | **L108** | 🟠 Medium (Major) | Reliability | `Add an explicit "type" attribute to this button.` | Add `type="button"`. |
| 30 | **L116** | 🟠 Medium (Major) | Reliability / Maintainability | `Ambiguous spacing before next element span` | Add explicit `{' '}` spacing or fix JSX inline whitespace formatting. |
| 31 | **L166** | 🟠 Medium (Major) | Reliability | `Add an explicit "type" attribute to this button.` | Add `type="button"`. |
| 32 | **L222** | 🟠 Medium (Major) | Reliability (A11y) | `A form label must be associated with a control.` | Link `<label>` with `<input>` using matching `htmlFor` and `id` attributes. |

---

## 🎯 Implementation Roadmap

We can tackle the remaining 31 issues in organized, high-efficiency batches:

- [ ] **Batch 1: Quick Fixes & Reliability (Buttons & Spacing)**: Add `type="button"` across 12 buttons in `Navbar`, `BatchDetail`, `NewBatchWizard`, `SuccessPage`, `Step2Verification`, and `Step3Review`. Fix JSX whitespace ambiguity in `Step3Review`.
- [ ] **Batch 2: Form & Accessibility Fixes**: Fix `FormEvent` deprecations (`Navbar`, `BatchDetail`, `Step3Review`) and associate the form label in `Step3Review` with its control (`htmlFor`/`id`).
- [ ] **Batch 3: Code Cleanliness & Optional Chaining**: Add optional chaining in scraper handlers (`getMemberStatus.js`, `loginScraper.js`), make props read-only in `SearchSelectorModal.tsx`, and update assertion in `api.test.ts`.
- [ ] **Batch 4: Structural & Component Refactoring**: Extract inline sub-components in `Step2Verification.tsx` out of the parent component, and simplify nested ternaries in `Step1Org.tsx`.
