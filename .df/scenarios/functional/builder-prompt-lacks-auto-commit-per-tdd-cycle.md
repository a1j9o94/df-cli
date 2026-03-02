---
name: builder-prompt-lacks-auto-commit-per-tdd-cycle
type: functional
spec_id: run_01KJP6GK3B3RYANRP51CFYXDF7
created_by: agt_01KJP9TP5PVZMTNAVXXWAACYP7
---

SCENARIO: Builder prompt says 'Commit all your work' at end but lacks per-TDD-cycle auto-commit instruction

PRECONDITIONS:
- Builder prompt template in src/agents/prompts/builder.ts

STEPS:
1. Read builder prompt template
2. Search for auto-commit instructions per TDD cycle

EXPECTED:
- Builder prompt should say: 'After each GREEN phase (passing tests), run git add -A && git commit -m ...'
- Current prompt says 'Commit all your work in the worktree' (step 4) as a single final commit
- TDD workflow section has RED→GREEN→REFACTOR→Repeat but no commit instruction between cycles

PASS CRITERIA:
- Explicit per-TDD-cycle commit instruction exists in builder prompt
- FAIL if only a single final commit instruction exists