---
name: clean-worktree-passthrough
type: functional
spec_id: run_01KJQQT8BDGGZEKPZN2WEF41K9
created_by: agt_01KJQQT8BFH68W87KWNKGGES7S
---

PRECONDITION: A git repo with main branch and a worktree branch. The worktree is clean — all changes committed, no unstaged files, no protected files tracked. STEPS: (1) Create main repo with initial commit. (2) Create worktree branch. (3) In worktree: add a new file, stage it, commit it properly. No unstaged changes remain. (4) Advance main with a different non-conflicting commit. (5) Call sanitizeWorktree(worktreePath). (6) Call rebaseWorktreeBranch(worktreePath, 'main'). EXPECTED: sanitizeWorktree is a no-op — no new commits created (commit count before === commit count after). git status --porcelain was already empty. Rebase proceeds normally and succeeds. PASS CRITERIA: The number of commits on the worktree branch does NOT change after sanitizeWorktree (no sanitize commit created). SanitizeResult.committedChanges === false (or equivalent). RebaseResult.success === true. FAIL CRITERIA: sanitizeWorktree creates an unnecessary empty commit, or rebase fails.