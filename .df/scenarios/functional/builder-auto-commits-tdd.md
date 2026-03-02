---
name: builder-auto-commits-tdd
type: functional
spec_id: run_01KJQ3RPWCVM02YZ86GB23AHTX
created_by: agt_01KJQ3RPWEX5P5Z3N2EG0ASHGW
---

## Scenario: Builder auto-commits after each TDD cycle

### Preconditions
- A builder agent is spawned for a module that requires implementing 3 distinct functions/features
- The module has a worktree assigned
- Each function has a corresponding test

### Test Steps
1. Run a builder that implements 3 functions with tests (RED->GREEN->REFACTOR for each)
2. After the builder completes, inspect the git log in the builder's worktree
3. Count the number of commits made by the builder

### Expected Results
- There should be at least 3 separate git commits in the worktree (one per TDD cycle)
- Each commit message should describe what was implemented (e.g., 'feat: <what was implemented>')
- Commits should be incremental — each one should add a passing test plus the implementation
- The builder prompt/instructions must include guidance to commit after each passing test

### Pass/Fail Criteria
- PASS: 3+ separate commits exist in the worktree, each corresponding to a TDD cycle with passing tests
- FAIL: Only 1 commit at the end, or no commits between TDD cycles