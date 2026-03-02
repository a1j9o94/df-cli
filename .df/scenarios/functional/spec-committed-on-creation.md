---
name: spec-committed-on-creation
type: functional
spec_id: run_01KJQ3REAY3PPJ95V0NGGPB8WZ
created_by: agt_01KJQ3REAZSCFRXXN0X7HMFP16
---

## Test: Spec committed on creation

### Preconditions
- A Dark Factory project is initialized inside a git repository
- The git repo has at least one initial commit
- Working tree is clean (no uncommitted changes)

### Steps
1. Record the current HEAD commit hash: `git rev-parse HEAD`
2. Run `dark spec create "Test Spec For Git Commit"`
3. Capture the spec ID from the output
4. Record the new HEAD commit hash: `git rev-parse HEAD`
5. Verify HEAD changed (new commit was created)
6. Run `git log --oneline -1` to see the latest commit message
7. Run `git show --name-only HEAD` to see which files were committed
8. Verify the spec file (e.g., `.df/specs/spec_<id>.md`) is in the commit

### Expected Output
- Step 4-5: HEAD hash is different from Step 1 (a new commit was created)
- Step 6: Commit message references the spec creation
- Step 7-8: The committed files include the new spec markdown file

### Pass Criteria
- `dark spec create` creates a git commit containing the new spec file
- The commit is automatic (no manual git add/commit required)
- The spec file is tracked in git history immediately after creation

### Repeat for scenario create
9. Run `dark scenario create <agent-id> --name "test-scenario" --type functional --content "test content"`
10. Verify a new git commit was created containing the scenario file