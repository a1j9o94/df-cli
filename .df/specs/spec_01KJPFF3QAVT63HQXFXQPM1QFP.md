---
id: spec_01KJPFF3QAVT63HQXFXQPM1QFP
title: "Break up engine.ts: extract build-phase, instructions, merge-phase, agent-lifecycle"
type: refactor
status: draft
version: 0.1.0
priority: critical
---

# Break Up engine.ts

## Problem

`src/pipeline/engine.ts` is 1136 lines and growing. Every spec that touches the pipeline requires modifying this file. Builder agents crash when editing it because they run out of context reading, understanding, and modifying a file this large. This has caused 8+ builder failures across 3 different specs.

This is the #1 blocker for pipeline self-improvement. Until engine.ts is smaller, the system can't reliably build itself.

## Goal

Extract engine.ts into 4-5 focused files. Each file should be <300 lines. The engine.ts orchestrator remains but delegates to extracted modules. No behavior changes — pure refactor.

## Requirements

Each module below should be a NEW file that the builder CREATES (not modifies). The only file that gets MODIFIED is engine.ts itself, which shrinks as code moves out.

IMPORTANT: Each module is independent. The architect MUST decompose this so that each builder only creates new files. The one module that modifies engine.ts should be the LAST one, after all extraction targets exist.

### Module 1: `src/pipeline/instructions.ts` (NEW FILE — ~150 lines)
Extract `sendInstructions()` and all its role-specific cases.
- Export: `sendInstructions(db, runId, agentId, role, context)`
- Includes all the mail body builders for architect, builder, evaluator, merger, integration-tester
- engine.ts imports and calls `sendInstructions()` instead of having the method inline

### Module 2: `src/pipeline/build-phase.ts` (NEW FILE — ~400 lines)
Extract `executeBuildPhase()` and `executeResumeBuildPhase()`.
- Export: `executeBuildPhase(db, runtime, config, runId)` and `executeResumeBuildPhase(db, runtime, config, runId, completedModules)`
- Includes all worktree creation, contract binding, dependency satisfaction, builder polling
- engine.ts calls these instead of having them inline

### Module 3: `src/pipeline/merge-phase.ts` (NEW FILE — ~100 lines)
Extract `executeMergePhase()`.
- Export: `executeMergePhase(db, runtime, config, runId)`
- Includes worktree path collection and merger spawning
- engine.ts calls this instead of having it inline

### Module 4: `src/pipeline/agent-lifecycle.ts` (NEW FILE — ~80 lines)
Extract `waitForAgent()`, `estimateCostIfMissing()`, and `executeAgentPhase()`.
- Export: `waitForAgent(db, runtime, agentId, pid)`, `estimateCostIfMissing(db, agent)`, `executeAgentPhase(db, runtime, runId, role, getPrompt, context)`
- These are the core agent management primitives used by all phases

### Module 5: Wire up engine.ts (MODIFY — shrink to ~350 lines)
Replace inline methods with imports from the new modules.
- `execute()` and `resume()` stay in engine.ts — they're the top-level orchestration
- `executePhase()` stays — it's the phase dispatch switch
- Everything else is imported
- engine.ts shrinks from 1136 to ~350 lines

## Decomposition Constraint

The architect MUST structure this so modules 1-4 are NEW files (builders create them) and module 5 is the only one that modifies engine.ts. Module 5 depends on 1-4. This maximizes builder success rate.

## Scenarios

### Functional

1. **Typecheck passes**: `bun run typecheck` has zero errors after refactor.
2. **All tests pass**: `bun test` — all 100+ existing tests pass unchanged.
3. **engine.ts under 400 lines**: `wc -l src/pipeline/engine.ts` is under 400.
4. **No behavior change**: Run `dark build` end-to-end, verify same pipeline behavior.

### Changeability

1. **Modify build phase without touching engine.ts**: A future spec that changes builder behavior only needs to modify `build-phase.ts`, not `engine.ts`. Verify the import boundary is clean.
