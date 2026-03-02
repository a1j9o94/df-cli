---
name: merge-phase-ignores-staging
type: functional
spec_id: run_01KJR04XQAYBX32C17TQTRNYD0
created_by: agt_01KJR04XQCHDRJMFPFA5FH4XQ1
---

## Scenario: Merge phase ignores staging branches, only processes ready

### Preconditions
- A run with 3 builder modules: module-a, module-b, module-c
- module-a: completed, branch promoted to `df-ready/.../module-a-...`
- module-b: completed, branch promoted to `df-ready/.../module-b-...`
- module-c: incomplete (process exited with commits), branch is `df-staging/.../module-c-...`

### Steps
1. Build phase completes (module-a and module-b succeeded, module-c went incomplete)
2. Wait — actually, with current flow the build phase would abort when module-c goes incomplete. So this scenario requires that module-c was optional or that we force the merge phase to run.
   Alternative setup: 3 modules where 2 agents called complete (promoted to df-ready/) and 1 agent was manually set to df-staging/ to simulate a branch that wasn't promoted.
3. Merge phase runs: `executeMergePhase()` queries for agents with branch_name LIKE 'df-ready/%'
4. It finds module-a and module-b worktree_paths (whose branches are df-ready/)
5. It does NOT find module-c (branch is df-staging/, excluded by query)
6. rebaseAndMerge() is called with only 2 worktree paths

### Expected Outputs
- Merge phase processes exactly 2 branches (module-a and module-b)
- module-c's staging branch is invisible to the merge phase
- If no df-ready/ branches exist at all, merge phase fails with: 'No validated branches to merge. Agents may have completed work but didn't call dark agent complete.'

### Verification
- Check rebase-merge-result event: mergedBranches should contain module-a and module-b branches only
- module-c branch still exists as df-staging/... in git
- The merged target branch does NOT contain module-c's changes

### Additional Test: No Ready Branches
- If ALL modules are df-staging/ (none promoted), merge phase should throw error:
  'No validated branches to merge. Agents may have completed work but didn't call dark agent complete.'

### Pass/Fail Criteria
- PASS: Only df-ready/ branches are merged, df-staging/ branches ignored, proper error when no ready branches
- FAIL: df-staging/ branches merged, or no error when all branches are staging