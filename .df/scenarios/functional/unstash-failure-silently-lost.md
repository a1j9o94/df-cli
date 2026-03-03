---
name: unstash-failure-silently-lost
type: functional
spec_id: run_01KJRQYQMGFJ5J31M5F5CCD6KM
created_by: agt_01KJRVEYFDXJNJKNTH0MA6VNV3
---

SCENARIO: When unstashMainRepo() fails (e.g., stash pop conflicts with merged changes), the error is silently swallowed. STEPS: 1. Have uncommitted local changes in main repo. 2. Run a merge that modifies the same files. 3. After merge completes, unstashMainRepo() is called. 4. Stash pop produces a conflict. EXPECTED: User is warned that their stashed changes could not be restored, with instructions to run 'git stash list' and 'git stash pop' manually. ACTUAL: unstashMainRepo() returns false but the callers in rebase-merge.ts (line 341) and merge-phase.ts (line 268) never check the return value. The user's uncommitted changes are silently lost.