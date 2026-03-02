---
name: worktree-excludes-state-db
type: functional
spec_id: run_01KJP6FN10E981ZTJDAYHGHVXQ
created_by: agt_01KJP6FN18BEE7QPK06ETWXPQH
---

## Worktree Excludes State DB

### Preconditions
- A Dark Factory project is initialized (dark init)
- .df/state.db exists with at least one run recorded

### Steps
1. Call createWorktree() (or trigger it via engine build phase) to create a new worktree
2. In the new worktree, verify a .gitignore file exists at the worktree root
3. Verify the .gitignore contains entries for: .df/state.db*, .df/worktrees/, .df/logs/, .claude/, .letta/
4. In the worktree, create a dummy .df/state.db-wal file
5. Run git add .df/state.db-wal from the worktree
6. Attempt git commit

### Expected Results
- Step 2: .gitignore file exists at worktree root
- Step 3: All five patterns are present in the .gitignore
- Step 5: git add should either be blocked by .gitignore (file stays untracked) OR if somehow staged...
- Step 6: The pre-commit hook rejects the commit with a clear error message mentioning .df/state.db
- The .df/state.db* files must NEVER appear in a commit from a worktree branch

### Pass/Fail Criteria
- PASS: .gitignore is auto-created in worktree AND .df/state.db* files cannot be committed
- FAIL: .gitignore is missing, or .df/state.db* files can be committed from the worktree