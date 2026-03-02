---
id: spec_01KJQM4Q5GF4N59MY8JEG1J29R
title: "Auto-escalate failed builders: re-decompose on repeated crashes"
type: feature
status: draft
version: 0.1.0
priority: high
---

# Auto-escalate Failed Builders

## Problem

When a builder crashes on a module, `dark continue` retries the same module with the same scope. If the module is too large or complex for a single builder (e.g. modifying a 600-line file), it fails repeatedly — we've seen modules fail 3+ times with no progress. The system should recognize when retry is futile and escalate to re-decomposition instead.

## Goal

After N failed attempts on the same module (default: 2), the engine should automatically re-invoke the architect to break the failing module into smaller sub-modules, then build those instead. The human never needs to intervene — the system self-heals by decomposing harder.

## Requirements

### Module 1: Failure tracking per module
- Track retry count per module in the `agents` table (or a new `module_attempts` table)
- `getModuleAttemptCount(db, runId, moduleId): number` — count failed builders for this module
- Configurable threshold in `config.yaml`: `build.max_module_retries: 2` (default)

### Module 2: Re-decomposition trigger
- In `executeBuildPhase()` / `executeResumeBuildPhase()`, before spawning a builder for a module:
  1. Check `getModuleAttemptCount()`
  2. If count >= threshold, don't retry — trigger re-decomposition instead
- Re-decomposition:
  1. Spawn a mini-architect agent with a focused prompt: "Module X failed N times. Break it into 2-3 smaller sub-modules."
  2. The mini-architect reads the original module's scope, the error from the last attempt, and any partial work in the worktree
  3. It submits an updated buildplan with the failing module replaced by sub-modules
  4. The build phase continues with the sub-modules

### Module 3: Mini-architect prompt
- Focused prompt: not a full spec decomposition, just splitting one module
- Includes: original module scope, error messages from failed attempts, partial work (git log from worktree if it exists)
- Output: a buildplan patch (new sub-modules to replace the failed one, updated dependencies)
- The sub-modules should each be small enough to succeed (creates new files, or modifies <200 lines)

### Module 4: Buildplan patching
- `patchBuildplan(db, runId, oldModuleId, newModules[])` — replace a module with sub-modules in the active buildplan
- Update dependencies: anything that depended on the old module now depends on ALL sub-modules
- Anything the old module depended on is inherited by all sub-modules
- Create new contracts if needed for the sub-module boundaries
- Emit event: `module-redecomposed` with old module ID and new module IDs

## Scenarios

### Functional

1. **Auto-redecompose after 2 failures**: Module X fails twice. On the 3rd attempt, the engine spawns a mini-architect instead of another builder. Verify sub-modules are created and built successfully.

2. **Sub-modules inherit dependencies**: Module X depended on A and was depended on by B. After redecomposition into X1 and X2, verify X1 and X2 both depend on A, and B depends on both X1 and X2.

3. **Partial work preserved**: Module X made 2 commits before crashing. Verify the mini-architect sees those commits and incorporates the completed work into the sub-module scopes.

4. **Configurable threshold**: Set `max_module_retries: 1`. Verify redecomposition triggers after the first failure.

5. **Module succeeds on retry**: Module X fails once, succeeds on retry (under threshold). Verify no redecomposition triggered.

### Changeability

1. **Custom escalation strategy**: Replacing "spawn mini-architect" with "ask the user" should only require swapping the escalation handler, not changing the failure detection or buildplan patching logic.
