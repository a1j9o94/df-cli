---
id: spec_01KJNGY44Y3T80K3TDXH1BVVDZ
title: Fix modules API to show latest agent status, not first (stale) agent on continued runs
type: bug
status: completed
version: 0.1.0
priority: high
---

# Fix modules API: show latest agent, not stale one

## Goal

When a run is continued with `dark continue`, the dashboard modules tab shows the OLD failed agent's status instead of the new running agent. A module that's actively being built shows as "failed" because the API returns the first agent for that module, not the most recent.

## Root Cause

In `src/dashboard/server.ts`, `handleGetModules()` line ~349:

```sql
SELECT * FROM agents WHERE run_id = ? AND module_id = ? LIMIT 1
```

This returns the earliest agent, which on a continued run is the failed one. The retry agent (created by `dark continue`) has the same `module_id` but a later `created_at`.

## Requirements

### Fix the query (`src/dashboard/server.ts`)

Change the agent lookup to order by `created_at DESC`:
```sql
SELECT * FROM agents WHERE run_id = ? AND module_id = ? ORDER BY created_at DESC LIMIT 1
```

This affects:
- `handleGetModules()` — the module card agent status
- Any other place that looks up "the agent for a module" should use the same pattern

### Also fix the run summary agent counts

`handleListRuns()` counts completed builders:
```sql
SELECT COUNT(*) FROM agents WHERE run_id = ? AND role = 'builder' AND status = 'completed'
```

On a continued run, this counts BOTH the old completed builders AND the new ones. If the same module was built twice (old failed, new completed), the count is inflated. Should count distinct module_ids that have at least one completed agent.

### Also fix in the engine

`executeBuildPhase()` uses `completedModules` to track what's done. On a continued run via `resume()`, it calls `getCompletedModules()` which does:
```sql
SELECT module_id FROM agents WHERE run_id = ? AND role = 'builder' AND status = 'completed'
```

This is correct — it returns module_ids not agent counts. But verify the build loop's `activeBuilders` filter doesn't re-spawn for modules that already have a completed agent.

## Scenarios

### Functional

1. **Dashboard shows running on continue**: Run a build, have one builder fail, `dark continue`. Open dashboard. Verify the module shows "Running" not "Failed".

2. **Completed module count accurate**: A run with 3 modules, 2 completed first attempt, 1 failed then completed on continue. Verify the dashboard shows 3/3 not 4/3.

3. **Module card shows latest agent details**: After continue, verify the module card shows the new agent's cost, elapsed time, and PID — not the old failed agent's.

### Changeability

1. **Add agent history to module**: Should be easy to show "Attempt 1: failed, Attempt 2: running" by querying all agents for the module instead of LIMIT 1.
