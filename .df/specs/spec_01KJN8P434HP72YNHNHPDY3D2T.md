---
id: spec_01KJN8P434HP72YNHNHPDY3D2T
title: Implement dark continue command to resume failed or interrupted pipeline runs
type: feature
status: completed
version: 0.1.0
priority: medium
---

# Implement `dark continue` command

## Goal

Allow users to resume a pipeline run from the last completed phase. When `dark build` fails mid-pipeline (agent crash, budget exceeded, timeout, ctrl-C), the user currently must start over from scratch. `dark continue` should pick up where it left off, reusing all work completed so far — architect's buildplan, builder worktrees, completed evaluations, etc.

## Context

The pipeline engine (`src/pipeline/engine.ts`) already tracks per-phase state in SQLite:
- `runs.current_phase` — last phase entered
- `runs.status` — "running", "failed", "completed"
- `agents` table — which agents completed, which failed
- `buildplans` table — architect's decomposition
- Builder worktrees persist on disk after failure
- Events table has full lifecycle trace

The engine's `execute()` method always starts from `PHASE_ORDER[0]` (scout). We need it to optionally start from a given phase, skipping phases that already completed successfully.

## Requirements

### Module 1: Continue Command (`src/commands/continue.ts`)
- `dark continue [run-id]` — resume the most recent failed/interrupted run (or a specific one)
- If no run-id given and only one failed run exists, auto-select it (like `dark build` auto-selects spec)
- If multiple failed runs, list them with phase info and ask user to pick
- Validate the run exists and is in a resumable state (status = "failed" or "running" with no active agents)
- Pass the resume point to the engine

### Module 2: Engine Resume Support (`src/pipeline/engine.ts`)
- Add `resume(runId: string, fromPhase?: string)` method or extend `execute()` with resume options
- Determine resume point: the first phase that did NOT complete successfully
  - Check events for `phase-completed` events — skip phases that have them
  - If build phase partially completed (some modules done, some failed), resume build with only the remaining modules
- Reset the run status from "failed" back to "running"
- Create a `run-resumed` event with metadata about what's being skipped
- Reuse existing buildplan (don't re-run architect if it completed)
- Reuse existing worktrees for completed builders (don't rebuild modules that passed)
- For partially completed build phase: only spawn builders for modules without completed agents

### Module 3: Partial Build Resume
- In `executeBuildPhase()`, check which modules already have `status=completed` agents
- Pre-populate `completedModules` set from DB before entering the build loop
- Pre-satisfy dependencies for already-completed modules
- Only spawn builders for modules that don't have completed agents
- Reuse existing worktrees (don't create new ones for completed modules)

## Contracts

- `ResumeOptions`: `{ runId: string; fromPhase?: PhaseName }` — passed from command to engine
- `getResumePoint(db, runId): PhaseName` — determine where to resume from based on event history
- `getCompletedModules(db, runId): Set<string>` — modules with completed builder agents

## Scenarios

### Functional

1. **Resume after architect failure**: Run fails during architect phase. Fix the issue. `dark continue` re-runs architect from scratch (no buildplan to reuse). Verify pipeline completes.

2. **Resume after partial build**: Run has 3 modules, 2 builders completed, 1 failed. `dark continue` only spawns a builder for the failed module. Verify the 2 completed modules are NOT rebuilt. Verify their worktrees are reused.

3. **Resume after evaluator failure**: All builders completed, evaluator failed. `dark continue` skips scout, architect, plan-review, build, and jumps straight to evaluate. Verify no agents spawned for skipped phases.

4. **Resume after budget exceeded**: Run hits budget cap mid-build. `dark continue --budget-usd 20` adds more budget and resumes. Verify the new budget is applied.

5. **Auto-select failed run**: Only one failed run exists. `dark continue` (no args) auto-selects it. Verify it resumes correctly.

6. **Multiple failed runs**: Two failed runs exist. `dark continue` lists them. `dark continue <run-id>` resumes the specified one.

7. **Nothing to resume**: No failed runs exist. `dark continue` prints a helpful message.

### Changeability

1. **Add --from-phase flag**: Should be easy to add `dark continue <run-id> --from-phase build` to force restart from a specific phase regardless of what completed. Verify it works without changing the resume detection logic.
