---
name: worktree-excludes-state-db
type: functional
spec_id: run_01KJQ3REAY3PPJ95V0NGGPB8WZ
created_by: agt_01KJQ3REAZSCFRXXN0X7HMFP16
---

## Test: Worktree excludes state DB files

### Preconditions
- A Dark Factory project is initialized with `dark init`
- The project root contains `.df/state.db` (SQLite database)

### Steps
1. Call `createWorktree(projectRoot, 'test-branch')` to create a new worktree
2. In the worktree directory, verify a `.gitignore` file exists
3. Verify the `.gitignore` contains entries for: `.df/state.db*`, `.df/worktrees/`, `.df/logs/`, `.claude/`, `.letta/`
4. In the worktree, create a file at `.df/state.db-wal` with dummy content
5. Run `git add .df/state.db-wal` in the worktree
6. Run `git commit -m 'test'` in the worktree
7. Verify the commit is rejected (either by gitignore preventing add, or by pre-commit hook)
8. Verify `.df/state.db-wal` is NOT in the git staging area

### Expected Output
- Step 2: `.gitignore` file exists in worktree root
- Step 3: All five patterns are present in the gitignore
- Step 7: The git add or commit is rejected for `.df/state.db*` files
- Step 8: No `.df/state.db*` files are staged

### Pass Criteria
- Worktree has a `.gitignore` with all protected patterns
- It is impossible to commit `.df/state.db*` files from a worktree