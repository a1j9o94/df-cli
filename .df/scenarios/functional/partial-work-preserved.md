---
name: partial-work-preserved
type: functional
spec_id: run_01KJSS7KMYARVEC5J0S3BGH46C
created_by: agt_01KJSS7KMZ2V6XM3W4WN6MV62B
---

## Partial work preserved for mini-architect

### Preconditions
- Module X has a worktree at a known path with 2 git commits from a previous failed builder
- Module X has failed 2+ times (threshold met)

### Setup
1. Create in-memory DB with schema
2. Create run, spec, and active buildplan with module X
3. Create a temporary git repository simulating a worktree for module X
4. Make 2 commits in the worktree:
   - Commit 1: 'Add helper function for feature X' (creates src/helper.ts)
   - Commit 2: 'Add partial implementation' (creates src/partial.ts)
5. Create 2 failed builder agents for module X, the most recent with worktree_path pointing to the temp repo
6. Set error messages on the failed agents: 'Context window exceeded while editing build-phase.ts'

### Test Steps
1. Call getFailedBuilderWorktree(db, runId, 'X') — should return the worktree path
2. Call getWorktreeCommits(worktreePath) — should return the 2 commits with hashes and messages
3. Generate the mini-architect prompt using getMiniArchitectPrompt() with:
   - moduleId: 'X'
   - original scope from the buildplan
   - error messages from both failed attempts
   - previousCommits from getWorktreeCommits()
4. Verify the prompt contains:
   a. The original module scope description
   b. Error message 'Context window exceeded while editing build-phase.ts'
   c. The commit messages 'Add helper function for feature X' and 'Add partial implementation'
   d. Instruction to incorporate completed work into sub-module scopes
   e. A directive to make each sub-module small enough to succeed (<200 lines modification)

### Expected Output
- Worktree path correctly retrieved from failed agent record
- 2 commits found in worktree
- Mini-architect prompt includes all error context and previous commit information
- Prompt instructs architect to account for partial work when splitting

### Pass/Fail Criteria
- PASS: Prompt contains error messages, commit history, original scope, and decomposition guidance
- FAIL: Any of error messages, commit history, or scope missing from the prompt