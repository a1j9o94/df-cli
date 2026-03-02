---
name: retry-reuses-worktree
type: functional
spec_id: run_01KJP8WZ5DKH52F4S0SWCGKJWW
created_by: agt_01KJP8WZ5FJ90GR22QSDS2FYR3
---

## Scenario: Retry reuses worktree with commits

### Preconditions
- A builder agent previously failed for a module (e.g., module 'instruction-enrichment')
- The previous builder's worktree at /tmp/df-worktrees/instruction-enrichment-xxx still exists
- The worktree contains commits from the previous attempt
- dark continue is called to retry the run

### Test Steps
1. Query the agents table for the failed builder to get its worktree_path
2. Verify the worktree path exists and has commits (git log)
3. Call dark continue to resume the run
4. Observe the new builder spawned for the same module
5. Check the new builder's worktree_path in the agents table
6. Verify it matches the PREVIOUS worktree path (reused, not a fresh /tmp/df-worktrees/instruction-enrichment-yyy)
7. Check the new builder's mail instructions reference the previous commits

### Expected Output
- The resume build phase checks for existing worktrees before creating new ones
- DB query: SELECT worktree_path FROM agents WHERE run_id = ? AND module_id = ? AND status = 'failed' returns the old path
- If the old worktree exists AND has commits since HEAD, it is reused
- The new builder's instructions include: 'Previous attempt made these commits: [list]'
- The new builder works in the same worktree, not a fresh one

### Pass/Fail Criteria
- PASS: New builder reuses old worktree with commits intact, instructions mention previous commits
- FAIL: New builder gets a fresh worktree (ignoring previous work), OR old worktree was deleted before retry