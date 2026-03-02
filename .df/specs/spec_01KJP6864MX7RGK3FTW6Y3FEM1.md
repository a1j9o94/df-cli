---
id: spec_01KJP6864MX7RGK3FTW6Y3FEM1
title: "Protect state DB from agent corruption"
type: bug
status: draft
version: 0.1.0
priority: critical
---

# Protect State DB from Agent Corruption

## Incident

During a real pipeline run, the merger agent merged worktree branches that contained stale copies of `.df/state.db-shm` and `.df/state.db-wal`. This overwrote the main repo's active SQLite WAL files, destroying all run history — 10 runs, 43 agents, 48 scenarios, all gone. The spec markdown files survived (on disk as untracked files) but the DB state was unrecoverable.

Root cause: `.df/state.db` was in `.gitignore` but `.df/state.db-shm` and `.df/state.db-wal` were NOT. Worktrees are git checkouts, so they got copies of the WAL/SHM files. When the merger merged those branches back, the stale WAL/SHM overwrote the active ones.

The `.gitignore` fix is already applied (WAL/SHM added). But the deeper issue is that agents should never be able to modify `.df/` state files through git operations, and the merger should not be allowed to complete without passing tests.

## Requirements

### Guard 1: Worktree .gitignore enforcement
- When `createWorktree()` creates a new worktree, automatically add a `.gitignore` in the worktree root that excludes:
  ```
  .df/state.db*
  .df/worktrees/
  .df/logs/
  .claude/
  .letta/
  ```
- Verify this `.gitignore` is in place before spawning a builder in the worktree
- Builders cannot `git add` any `.df/state.db*` files — if they try, the pre-commit hook rejects

### Guard 2: Merger must pass tests before completing
- The `dark agent complete` guard for merger role must:
  1. Run the project's test command (`bun test`, `npm test`, or configured in `config.yaml`)
  2. Verify all tests pass (exit code 0)
  3. Scan for merge conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`) in all tracked files
  4. Verify `.df/state.db*` files are not staged or modified
  5. Only then allow the agent to complete
- If any check fails, reject with a clear error message explaining what failed

### Guard 3: Merger merge command sanitization
- Before merging a worktree branch, the merger should:
  1. Check out the branch in a temporary location
  2. Remove any `.df/state.db*`, `.claude/`, `.letta/` files from the branch's history
  3. Use `git merge --no-commit` first, inspect staged changes, remove forbidden files, then commit
- Alternatively: use `git merge` with a custom merge driver that auto-resolves `.df/*` conflicts by keeping the target branch version

### Guard 4: State DB backup before merge
- Before the merge phase starts, copy `.df/state.db` to `.df/state.db.backup`
- If the merge phase fails or corrupts the DB, restore from backup
- The backup is deleted on successful merge phase completion
- `dark status` should detect a corrupt/missing DB and offer to restore from backup

### Guard 5: Spec files committed immediately on creation
- `dark spec create` should `git add` and `git commit` the new spec file immediately
- This ensures spec files are tracked in git history even if the DB is corrupted
- Same for `dark scenario create` — commit the scenario file immediately
- This is the "belt and suspenders" approach: specs live in both DB and git

## Scenarios

### Functional

1. **Worktree excludes state DB**: Create a worktree, verify `.df/state.db*` cannot be committed from it.

2. **Merger fails on test failure**: Merge produces code that fails tests. Verify merger cannot call `dark agent complete`. Verify error message says which tests failed.

3. **Merger fails on conflict markers**: Merge leaves `<<<<<<<` in a file. Verify merger cannot complete.

4. **State DB survives merge**: Run a full pipeline with merge. Verify `.df/state.db` has the same run count before and after merge.

5. **Backup and restore**: Corrupt `.df/state.db`. Run `dark status`. Verify it detects corruption and offers to restore from `.df/state.db.backup`.

6. **Spec committed on creation**: `dark spec create "test"`. Verify a git commit was created containing the spec file.

### Changeability

1. **Add new protected path**: Adding a new file pattern to the "never merge" list should only require updating the worktree `.gitignore` template and the merger sanitization list. No structural changes.
