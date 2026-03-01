---
id: spec_01KJNH6NJYQ79JK60R2HWD81MY
title: "Add dark pause and dark resume: graceful stop and restart of running builds with worktree preservation"
type: feature
status: draft
version: 0.1.0
priority: high
---

# `dark pause` and `dark resume`

## Goal

Allow a user to gracefully stop running builds and restart them later, preserving worktree progress. This is different from `dark continue` which handles failures:

- **`dark pause`** — user-initiated, graceful. Agents have done good work, just need to stop (internet going down, switching contexts, end of day). Worktrees preserved, agents get a "paused" status.
- **`dark continue`** — handles failures. Agents crashed or hit errors. Worktrees may be corrupt. Fresh builder starts clean.

The key distinction: paused builders reuse their worktree (the work was good, just interrupted). Failed builders start fresh (the work may be bad).

## Current State

There's no pause mechanism. The only way to stop a running build is:
1. Kill the process (ctrl-C) — agents become orphaned, engine marks them as crashed
2. Budget exhaustion — agents get killed, treated as failures
3. Both result in `status=failed`, and `dark continue` starts fresh worktrees

## Requirements

### New agent status: "paused" (`src/types/agent.ts`)

Add `"paused"` to `AgentStatus`. A paused agent is distinct from failed:
- `paused` — user requested stop, work is good, worktree preserved
- `failed` — agent hit an error, work may be bad

### `dark pause [run-id]` command (`src/commands/pause.ts`)

- If no run-id, pause ALL running runs (common case: "I'm going offline")
- If run-id specified, pause just that run
- For each running agent in the paused run:
  1. Send a `SIGTERM` to the agent process (graceful — lets Claude finish current turn)
  2. Wait up to 30 seconds for the process to exit
  3. If still alive, `SIGKILL`
  4. Set agent status to `"paused"` (NOT "failed" or "killed")
  5. Preserve the worktree path in the agent record
- Set run status to `"paused"`
- Create event: `run-paused`
- Output: "Paused run {id}. {n} agents stopped, worktrees preserved. Resume with: dark resume {id}"

### `dark resume [run-id]` command (`src/commands/resume.ts`)

Different from `dark continue`:
- Only works on `status=paused` runs (not failed)
- For each paused builder agent:
  1. Check if the worktree still exists on disk
  2. If yes: spawn a new Claude agent in THE SAME worktree. Send it mail with context: "You're continuing work on module {id}. Your previous progress is in this worktree. Check git log to see what was done. Continue from where you left off."
  3. If no (OS cleaned /tmp/): fall back to `dark continue` behavior — fresh worktree, log a warning
- For non-builder agents (evaluator, merger): just re-spawn fresh (they're lightweight)
- Create a new agent record linked to the same module, with the same worktree_path
- Resume the pipeline from the current phase

### `dark continue` behavior unchanged

`dark continue` must NOT reuse worktrees for failed builders. This is the critical distinction:
- `continue` on a `failed` run → fresh worktrees (work was bad)
- `resume` on a `paused` run → reuse worktrees (work was good, just interrupted)

### Engine awareness (`src/pipeline/engine.ts`)

- `executeBuildPhase` should recognize paused builders and not treat them as failures
- The build loop should not re-spawn for modules that have a `paused` agent (only `resume` triggers re-spawn)
- Budget tracking: paused time doesn't count toward cost

### Worktree persistence

Currently worktrees are created in `/tmp/` which gets cleaned. For paused builds, the worktrees need to survive:
- On pause, if worktree is in `/tmp/`, move it to `.df/worktrees/paused/{module-id}/`
- On resume, use it from there
- On successful merge or explicit cleanup, delete it

## Contracts

- `PauseOptions`: `{ runId?: string }` — if omitted, pause all running
- `ResumeOptions` (extend existing): add `preserveWorktrees: boolean` flag
- Agent status `"paused"` is NOT in `getActiveAgents` results (paused ≠ active)
- `getResumableRuns` should NOT return paused runs (those use `dark resume`, not `dark continue`)

## Scenarios

### Functional

1. **Pause and resume preserves work**: Start a build, let a builder create some files, pause, resume. Verify the resumed builder's worktree has the files from the first attempt. Verify it doesn't rebuild from scratch.

2. **Pause all running**: Start 3 builds, run `dark pause` (no args). Verify all 3 are paused. `dark status` shows all as paused.

3. **Resume specific run**: Pause 2 runs. `dark resume {id}` resumes only one. Verify the other stays paused.

4. **Continue still starts fresh on failure**: Have a builder fail (call `dark agent fail`). `dark continue` the run. Verify the builder gets a FRESH worktree, not the failed one.

5. **Paused worktrees survive /tmp cleanup**: Pause a build. Verify worktrees are moved to `.df/worktrees/paused/`. Simulate /tmp cleanup (delete the /tmp path). Resume. Verify it uses the `.df/worktrees/paused/` copy.

6. **Pause during different phases**: Pause during architect phase, during build phase, during evaluate phase. Verify all resume correctly from the paused phase.

7. **dark continue rejects paused runs**: Run `dark continue` on a paused run. Verify it says "Run is paused, not failed. Use 'dark resume' instead."

8. **dark resume rejects failed runs**: Run `dark resume` on a failed run. Verify it says "Run failed. Use 'dark continue' for failed runs."

### Changeability

1. **Add pause timeout**: Adding an auto-pause after N minutes of inactivity should only require a timer in the engine, not changes to the pause/resume commands.
