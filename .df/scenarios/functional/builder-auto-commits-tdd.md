---
name: builder-auto-commits-tdd
type: functional
spec_id: run_01KJP8WZ5DKH52F4S0SWCGKJWW
created_by: agt_01KJP8WZ5FJ90GR22QSDS2FYR3
---

## Scenario: Builder auto-commits after each TDD cycle

### Preconditions
- A builder agent is spawned in an isolated worktree
- The builder prompt includes auto-commit instructions

### Test Steps
1. Check that the builder prompt template (src/agents/prompts/builder.ts) contains auto-commit instructions
2. Verify the instruction tells builders to run 'git add -A && git commit' after each passing test
3. Simulate or inspect a builder run where 3 functions are implemented with tests
4. Check the git log in the worktree

### Expected Output
- The builder prompt contains an explicit instruction like: 'After each passing test, commit your changes'
- The instruction includes the git command format: 'git add -A && git commit -m ...'
- After a builder run implementing 3 features, the worktree git log shows >= 3 separate commits (one per TDD cycle)

### Pass/Fail Criteria
- PASS: Builder prompt contains auto-commit instruction AND worktree shows multiple incremental commits after builder completes
- FAIL: Builder prompt lacks auto-commit instruction, OR builder only makes one final commit