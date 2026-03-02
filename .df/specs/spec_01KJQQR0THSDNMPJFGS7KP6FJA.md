---
id: spec_01KJQQR0THSDNMPJFGS7KP6FJA
title: "Pre-merge worktree sanitization: clean dirty worktrees before rebase"
type: bug
status: draft
version: 0.1.0
priority: critical
---

# Pre-merge Worktree Sanitization

## Problem

The merge phase fails because builder worktrees have:
1. **Unstaged changes** — builders don't always commit everything before calling complete
2. **Protected files** (`.df/state.db*`, `.claude/`, `node_modules/`) committed or unstaged
3. **node_modules/** installed by builders during TDD but not gitignored (worktrees created before protection fix)

The rebase-merge code tries to rebase the worktree branch onto main, but git refuses because the working tree is dirty. Every run with 3+ modules hits this.

## Goal

Before attempting any rebase or merge, the merge phase should sanitize each worktree branch: remove protected files, commit any unstaged work, and ensure a clean working tree. This should be automatic and silent — the merger shouldn't need to know about worktree hygiene.

## Requirements

### Pre-rebase sanitization step (in `rebase-merge.ts`)
For each worktree branch, before calling `git rebase`:

1. `cd` to the worktree
2. `git rm --cached` all protected paths (using `PROTECTED_PATTERNS` from `protected-paths.ts`)
3. `git checkout -- .claude/CLAUDE.md .letta/` to discard Letta/Claude config changes
4. `rm -rf node_modules/` from the worktree (it gets reinstalled, shouldn't be committed)
5. `git add -A` any remaining unstaged changes
6. If there are staged changes: `git commit -m "df: sanitize worktree before merge"`
7. Verify `git status --porcelain` is empty before proceeding to rebase
8. If still dirty after sanitization, fail with a clear error listing the dirty files

### Also handle the main repo side
Before merging INTO main:
1. `git stash` if main has uncommitted changes
2. After all merges complete, `git stash pop`
3. Remove any `node_modules/` that leaked into git tracking

## Scenarios

### Functional

1. **Dirty worktree auto-cleaned**: Builder completes without committing. Merge phase sanitizes and commits the remaining changes. Rebase succeeds.

2. **Protected files removed**: Worktree has `.df/state.db-wal` committed. Sanitization removes it before rebase. Merge doesn't corrupt main DB.

3. **node_modules removed**: Worktree has `node_modules/` in working tree. Sanitization deletes it. Rebase doesn't try to merge 10K dependency files.

4. **Clean worktree passes through**: Worktree is already clean. Sanitization is a no-op. Rebase proceeds normally.

5. **Main repo stashed**: Main has uncommitted `.claude/CLAUDE.md` changes. Merge phase stashes, merges, pops. No "dirty working tree" errors.
