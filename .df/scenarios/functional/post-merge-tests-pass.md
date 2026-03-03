---
name: post-merge-tests-pass
type: functional
spec_id: run_01KJRKACB26XMX8A0GG81GBA6N
created_by: agt_01KJRKACB4M7MSFDSCEN1VJ9T4
---

After all branches are merged (with or without agent-resolved conflicts), the project test suite (bun test) must pass.

SETUP:
1. A project with a working test suite (bun test exits 0 before any merges)
2. Multiple builder branches that each independently pass tests
3. After merging all branches (some with conflict resolution), the combined code must still pass tests

VERIFICATION:
1. After executeMergePhase completes, run: bun test
2. Alternatively, verify that runProjectTests() from merger-guards.ts returns { passed: true }

EXPECTED:
- bun test exits with code 0 after all merges complete
- No test regressions from the merge process itself
- The conflict resolution did not break any existing functionality

PASS CRITERIA:
- bun test (or the configured test command) passes after merge phase completes
- If tests fail, the merge phase should report the failure clearly
- The post-merge validation agent (spawned after all branches merge) should run tests