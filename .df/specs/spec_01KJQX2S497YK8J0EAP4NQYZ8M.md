---
id: spec_01KJQX2S497YK8J0EAP4NQYZ8M
title: "Enforce agent complete: staging branch pattern"
type: bug
status: draft
version: 0.1.0
priority: critical
---

# Enforce Agent Complete

## Problem

Builder agents write code, commit to their worktree, and then the claude process exits without calling `dark agent complete`. The work IS done — commits exist — but the engine sees "process exited without completing" and marks it failed. We've confirmed this happens repeatedly: agents make 2-3 commits of real code, then the process exits cleanly.

If we just treat "has commits" as success, we lose the entire guard system. The `dark agent complete` call is where we enforce:
- Architect submitted buildplan + created scenarios
- Builder has file changes
- Evaluator reported results with scores
- Merger passed post-merge tests

Without calling complete, we have no visibility into whether the agent actually finished or just ran out of turns mid-work.

## Goal

Agent work must flow through a formal gate. Commits alone don't count. The pattern:

1. Agent works on a **staging branch** (the worktree branch, like `df-build/run_01KJ/module-name-abc123`)
2. Agent calls `dark agent complete <id>`
3. The complete command runs all guards for the agent's role
4. If guards pass: promote the staging branch to a **ready branch** (`df-ready/run_01KJ/module-name-abc123`)
5. The merge phase only looks at `df-ready/` branches — staging branches are invisible to it
6. If the agent's process exits without calling complete: the staging branch exists with commits, but it's NOT ready for merge. The engine marks it as `incomplete` (not `failed`), preserving the work for retry.

## Requirements

### Module 1: Branch naming convention
- Builders work on: `df-staging/<run-short>/<module-id>-<suffix>`
- On `dark agent complete` with passing guards: rename to `df-ready/<run-short>/<module-id>-<suffix>`
- The rename is atomic: `git branch -m df-staging/... df-ready/...`
- Merge phase collects branches matching `df-ready/` only
- `dark agent list` shows branch state: staging (work exists, not validated) vs ready (guards passed)

### Module 2: Update `dark agent complete` to promote branch
- After guards pass, run `git branch -m` in the worktree to rename staging → ready
- If the rename fails (e.g., branch already exists), fail with clear error
- Emit event: `agent-branch-promoted` with old and new branch names
- The agent's DB record stores the final branch name

### Module 3: Update engine to handle `incomplete` status
- New agent status: `incomplete` — process exited, has commits, didn't call complete
- When `waitForAgent()` detects PID dead + no complete call:
  - Check worktree for commits (`git log --oneline HEAD~1..HEAD`)
  - If commits exist: set status `incomplete` (not `failed`)
  - If no commits: set status `failed`
- `incomplete` agents are retryable — `dark continue` picks them up
- The retry builder sees the previous commits and continues from there
- Dashboard shows `incomplete` with an amber badge (distinct from red `failed`)

### Module 4: Update merge phase to only use ready branches
- `executeMergePhase()` collects branches matching `df-ready/` pattern
- `df-staging/` branches are ignored during merge
- If no ready branches exist for a run, merge phase fails with: "No validated branches to merge. Agents may have completed work but didn't call `dark agent complete`."

### Module 5: Update builder prompt
- Make the completion instruction more prominent and urgent
- Add at the END of the system prompt (not middle): "CRITICAL: You MUST call `dark agent complete <id>` as your FINAL action. Without this call, your work will NOT be merged."
- Add to the initial message too: "Your work is on a staging branch. It will NOT be merged until you call `dark agent complete <id>`."

## Scenarios

### Functional

1. **Agent calls complete, branch promoted**: Builder finishes work, calls complete, guards pass. Verify branch renamed from `df-staging/...` to `df-ready/...`. Verify merge phase picks it up.

2. **Agent exits without complete**: Builder makes commits but process exits. Verify agent status is `incomplete` (not `failed`). Verify staging branch exists with commits. Verify merge phase does NOT pick it up.

3. **Incomplete agent retried**: Agent is `incomplete`. `dark continue` runs. New builder sees previous commits. Builder calls complete this time. Verify branch promoted and merge succeeds.

4. **Agent complete rejected by guard**: Builder calls complete but has no file changes. Verify branch stays as `df-staging/`. Verify agent gets error message about the guard failure.

5. **Merge phase ignores staging branches**: Run has 3 modules. 2 are `df-ready/`, 1 is `df-staging/`. Verify merge only processes the 2 ready branches.

6. **Dashboard shows incomplete vs failed**: Verify `incomplete` agents show amber badge, `failed` agents show red badge. Both show in agent list.

### Changeability

1. **Add new guard to complete**: Adding a new validation check to `dark agent complete` should only require adding a check function — the staging→ready promotion logic doesn't change.
