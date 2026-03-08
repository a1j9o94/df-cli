---
name: workspace-types-no-merge-conflict
type: functional
spec_id: run_01KK7SEAH0J838RH3SWCBR48SQ
created_by: agt_01KK7WKAGDDJX8A7M6DDXSNTT6
---

Steps: 1. Merge all 4 builder branches (workspace-foundation, cross-repo-build-engine, cross-repo-scenarios-eval, dashboard-hierarchy-roadmap). 2. Verify src/types/workspace.ts has no merge conflicts. 3. Verify src/types/index.ts exports are not duplicated. 4. Run bun typecheck. Pass: All branches merge cleanly and TypeScript compiles. Fail: Merge conflicts in shared files (workspace.ts, index.ts) or typecheck failures.