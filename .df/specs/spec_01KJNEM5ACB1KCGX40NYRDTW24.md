---
id: spec_01KJNEM5ACB1KCGX40NYRDTW24
title: Enforce cost tracking on every agent-to-system call
type: bug
status: completed
version: 0.1.0
priority: high
---

# Enforce cost tracking on every agent-to-system call

## Goal

Cost tracking should be impossible to skip. Right now it only happens in some code paths — the multi-module builder loop and `executeAgentPhase`. The single-builder fallback, the resume build path, and agents that exit without calling complete all have $0 cost. This makes budget tracking unreliable.

Every time an agent calls back to the system (`dark agent heartbeat`, `dark agent complete`, `dark agent fail`, `dark mail check`, `dark mail send`, `dark scenario create`, `dark contract acknowledge`), the system should estimate cost from elapsed time since last call. This makes cost tracking automatic and unavoidable — not dependent on which engine code path ran.

## Root Cause

Cost estimation currently lives in the engine (`estimateCostIfMissing`) and only fires in specific code paths. It's called:
- In `executeAgentPhase` after `waitForAgent` returns (line ~742)
- In `executeBuildPhase` when a multi-module builder completes (line ~921)

It's NOT called:
- In the single-builder fallback (no buildplan) — `executeBuildPhase` line 799 returns without estimating
- In `executeResumeBuildPhase` single-builder fallback
- When an agent's process dies without calling complete (the engine marks it failed but doesn't estimate cost)

## Requirements

### Move cost estimation into agent commands (not the engine)

Create a shared helper `estimateAndRecordCost(db, agentId)` in `src/pipeline/budget.ts` that:
1. Reads the agent's `created_at` and `last_heartbeat` (or `updated_at`)
2. Computes elapsed time since the LATER of (last_heartbeat, last cost update, created_at)
3. Uses `cost_per_minute` from config (defaulting to 0.05) to estimate incremental cost
4. Calls `recordCost()` with the delta
5. Returns the new total cost

### Call it from every agent command

Every `dark agent *` and `dark mail *` command that an agent calls should trigger cost estimation as a side effect:
- `dark agent heartbeat <id>` — already tracks time, add cost estimate
- `dark agent complete <id>` — estimate final cost before marking complete
- `dark agent fail <id>` — estimate final cost before marking failed
- `dark mail check --agent <id>` — estimate cost on every mail check
- `dark mail send --from <id>` — estimate cost on every send
- `dark scenario create <id>` — estimate cost
- `dark contract acknowledge <id>` — estimate cost
- `dark agent report-result <id>` — estimate cost

### Remove engine-side estimation

Remove `estimateCostIfMissing` from the engine entirely. Cost tracking is now handled at the command layer — every touchpoint with the system records cost. The engine doesn't need to worry about which code path ran.

### Engine fallback for crashed agents

When the engine detects a crashed agent (PID dead, no complete/fail call), estimate one final cost increment based on time since last heartbeat/command. This is the ONLY place the engine should estimate cost — for agents that never got a chance to call back.

## Contracts

- `estimateAndRecordCost(db, agentId): number` — returns new total cost for agent
- Must be idempotent for rapid successive calls (uses time-since-last-update, not time-since-creation)

## Scenarios

### Functional

1. **Single builder cost tracked**: Run `dark build --skip-architect`. Verify the builder's cost is >$0 after completion.

2. **Cost increments on heartbeat**: Agent sends 3 heartbeats 30 seconds apart. Verify cost increases after each heartbeat. Verify the increments are proportional to elapsed time, not cumulative from creation.

3. **Cost recorded on mail check**: Agent calls `dark mail check`. Verify agent cost increases.

4. **Crashed agent cost estimated**: Spawn an agent, let it send one heartbeat, then kill the PID. Verify the engine estimates cost for the gap between last heartbeat and crash detection.

5. **No double-counting**: Agent calls heartbeat, then immediately calls complete. Verify cost doesn't double-count the same time period.

### Changeability

1. **Add new agent command**: Adding a new `dark agent <subcommand>` should automatically get cost tracking by calling the shared helper — one line of code.
