---
name: dirty-worktree-auto-cleaned
type: functional
spec_id: run_01KJQQT8BDGGZEKPZN2WEF41K9
created_by: agt_01KJQQT8BFH68W87KWNKGGES7S
---

PRECONDITION: A git repo with main branch and a worktree branch. The worktree has uncommitted changes (modified files not staged, new files not tracked). STEPS: (1) Create main repo with initial commit. (2) Create worktree branch with git worktree add. (3) In worktree: modify a tracked file AND create a new untracked file. Do NOT stage or commit. (4) Call sanitizeWorktree(worktreePath). (5) Call rebaseWorktreeBranch(worktreePath, 'main'). EXPECTED: sanitizeWorktree stages all changes, commits them with message 'df: sanitize worktree before merge'. git status --porcelain returns empty string. Rebase succeeds (RebaseResult.success === true). The committed changes include both the modified file and the new file. PASS CRITERIA: rebaseWorktreeBranch returns {success: true, conflicted: false}. The worktree branch log contains a commit with message containing 'sanitize worktree'. FAIL CRITERIA: rebaseWorktreeBranch throws or returns {success: false} due to dirty working tree.