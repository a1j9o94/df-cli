---
id: spec_01KJNG4MSN2NMD5RRC9AVHT8GY
title: Sequential merge strategy for parallel builds modifying the same files
type: feature
status: draft
version: 0.1.0
priority: critical
---

# Sequential merge strategy for parallel builds

## Goal

When multiple `dark build` runs complete around the same time, their merger agents all try to merge into main simultaneously. If they touch the same files (which they will — `engine.ts`, `index.ts`, dashboard files), the second merge fails with conflicts even if the changes are logically independent.

The system needs a merge queue: mergers acquire a lock, merge one at a time, and each subsequent merger rebases onto the latest main before merging.

## Current Problem

Right now we have 5 parallel builds. When they finish:
1. Merger A merges into main — succeeds
2. Merger B tries to merge — conflicts because main moved since its branch was created
3. Mergers C, D, E — same problem, compounding

The merger agent's current code (`src/runtime/worktree.ts:mergeWorktree`) does a bare `git merge` with no rebase step and no locking.

## Requirements

### Merge lock (`src/pipeline/merge-lock.ts`)

File-based lock at `.df/merge.lock`:
- `acquireMergeLock(dfDir, runId): boolean` — creates lockfile with run ID, returns true if acquired
- `releaseMergeLock(dfDir, runId): void` — removes lockfile only if it belongs to this run
- `waitForMergeLock(dfDir, runId, timeoutMs): Promise<void>` — polls until lock acquired or timeout
- Lock contains: `{ runId, acquiredAt, pid }` as JSON
- Stale lock detection: if the PID in the lockfile is dead, the lock is stale and can be stolen

### Rebase before merge

When the merger agent starts, before merging builder worktrees:
1. Acquire the merge lock (wait up to 5 minutes)
2. Rebase all builder branches onto current HEAD of target branch
3. If rebase has conflicts, attempt auto-resolution (take theirs for non-overlapping changes)
4. If auto-resolution fails, mark the run as needing manual merge and release lock
5. Merge rebased branches into target
6. Run tests post-merge
7. Release lock

### Engine integration (`src/pipeline/engine.ts`)

The merge phase should:
1. Wait for merge lock before spawning the merger agent
2. Pass the lock to the merger via mail instructions
3. After merger completes, release the lock (even on failure)
4. Log which runs are queued: `[dark] Merge queued: 2 runs ahead`

### Merge queue visibility

`dark status` should show merge queue position:
```
run_01XYZ  running  phase=merge (queued, 2 ahead)  $1.50/$15.00
```

Dashboard API should include queue position in the run summary.

## Scenarios

### Functional

1. **Sequential merge**: Two builds complete simultaneously. Verify they merge one at a time, not in parallel. Second merger waits for first to finish.

2. **Rebase before merge**: Build A merges, changing `engine.ts`. Build B's branch was created before A merged. Verify B rebases onto post-A main before merging, and the final main has both changes.

3. **Stale lock cleanup**: Acquire lock, kill the process. Start a new merge. Verify it detects the stale lock (dead PID) and steals it.

4. **Queue position displayed**: Three runs reach merge phase. Verify `dark status` shows queue positions.

5. **Lock timeout**: Set a short timeout. Have a merge take longer. Verify the queued run fails with "merge lock timeout" not a hang.

### Changeability

1. **Change lock backend**: Switching from file-based to DB-based locking should only require changing the lock functions, not the engine or merger code.
