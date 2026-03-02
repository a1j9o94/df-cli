---
name: add-new-guard-to-complete
type: change
spec_id: run_01KJR04XQAYBX32C17TQTRNYD0
created_by: agt_01KJR04XQCHDRJMFPFA5FH4XQ1
---

## Change Scenario: Add a new validation guard to dark agent complete

### Modification Description
Add a new guard that checks builder agents have run their tests (e.g., verify test files exist in the worktree's committed changes) before allowing completion. This new guard should slot into the existing guard system without affecting the staging→ready branch promotion logic.

### Expected Implementation
1. Open `src/commands/agent/complete.ts`
2. In the `checkCompletionGuard` function, under the `case 'builder'` block:
   - Add a new check after the existing file-change check
   - Example: verify that at least one file matching `*.test.ts` or `*.spec.ts` exists in the git diff
3. The new guard returns an error string if it fails, null if it passes
4. The staging→ready promotion logic (which runs AFTER guards pass) is completely untouched

### Affected Areas
- ONLY `src/commands/agent/complete.ts`, specifically the `checkCompletionGuard` function's builder case
- The promotion logic (git branch -m, event emission, branch_name update) is in a separate code path that runs only after ALL guards pass
- No changes needed to: merge-phase.ts, build-phase.ts, agent-lifecycle.ts, or any other file

### Expected Effort
- Difficulty: trivial (5-10 lines of code)
- Files modified: 1 (complete.ts)
- Risk of side effects: none — guard is purely additive, promotion logic has clean separation

### Pass/Fail Criteria
- PASS: New guard can be added by modifying only the checkCompletionGuard function. The promotion logic (git branch -m, createEvent for agent-branch-promoted, updateAgentBranchName) does not need modification. Adding the guard requires no changes to any other file.
- FAIL: Adding a new guard requires modifying the promotion logic or touching files beyond complete.ts. This would indicate poor separation between validation and promotion.