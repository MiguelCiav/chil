---
"chil": patch
---

Optimize CI/CD pipeline to use direct automated releases on merge to main:
- Removed intermediary "Version Packages" PR cycle, allowing automatic versioning, tagging, and immediate Firebase deployment in a single run upon merging to `main`.
- Added build artifact sharing between test and deploy stages to eliminate redundant Vite builds.
- Configured path filters to ignore documentation-only changes and added concurrency cancel-in-progress controls for feature PRs.
