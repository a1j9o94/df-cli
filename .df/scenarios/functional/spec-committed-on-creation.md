---
name: spec-committed-on-creation
type: functional
spec_id: run_01KJP6FN10E981ZTJDAYHGHVXQ
created_by: agt_01KJP6FN18BEE7QPK06ETWXPQH
---

## Spec Committed on Creation

### Preconditions
- A Dark Factory project is initialized inside a git repository
- The git working tree is clean (no uncommitted changes)

### Steps
1. Run: dark spec create 'Test spec for commit verification'
2. Capture the spec ID from the output
3. Run: git log --oneline -1 to see the most recent commit
4. Run: git show --stat HEAD to see what files were committed
5. Repeat for scenario: dark scenario create <agent-id> --name 'test-scenario' --type functional --content 'test content'
6. Run: git log --oneline -1 again
7. Run: git show --stat HEAD again

### Expected Results
- Step 3: The most recent commit message mentions the spec creation (e.g., 'dark: add spec spec_XXXXX')
- Step 4: The commit contains exactly the new spec file (.df/specs/spec_XXXXX.md)
- Step 6: The most recent commit message mentions the scenario creation
- Step 7: The commit contains the new scenario file (.df/scenarios/functional/test-scenario.md)
- Both commits are immediate (no manual git add/commit needed)

### Pass/Fail Criteria
- PASS: Both spec and scenario files are auto-committed to git immediately upon creation
- FAIL: Files are created on disk but not committed to git, OR git commit is missing