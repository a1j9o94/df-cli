---
name: main-repo-stashed
type: functional
spec_id: run_01KJQQT8BDGGZEKPZN2WEF41K9
created_by: agt_01KJQQT8BFH68W87KWNKGGES7S
---

PRECONDITION: A git repo with main branch that has uncommitted changes (e.g., modified .claude/CLAUDE.md). A completed worktree branch ready to merge. STEPS: (1) Create main repo with initial commit. Include a .claude/CLAUDE.md file. (2) Create worktree branch, add a feature file, commit it. (3) On main: modify .claude/CLAUDE.md (do NOT commit). Verify git status shows dirty. (4) Call rebaseAndMerge([worktreePath], mainRepoPath, 'main'). EXPECTED: rebaseAndMerge detects main is dirty, runs 'git stash' before merging. Merge proceeds and succeeds. After merge completes, runs 'git stash pop' to restore the uncommitted .claude/CLAUDE.md changes. PASS CRITERIA: MergeResult.success === true. After rebaseAndMerge returns, the worktree branch's feature file exists on main (merge succeeded). The .claude/CLAUDE.md file on main contains the uncommitted modifications (stash was popped). No 'dirty working tree' errors thrown. FAIL CRITERIA: rebaseAndMerge throws an error about dirty working tree. Or the uncommitted .claude/CLAUDE.md changes are lost after merge.