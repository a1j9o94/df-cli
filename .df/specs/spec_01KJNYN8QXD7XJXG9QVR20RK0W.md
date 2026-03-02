---
id: spec_01KJNYN8QXD7XJXG9QVR20RK0W
title: "Budget auto-pause: pause runs at budget limit instead of failing, with
  notification and easy resume"
type: feature
status: draft
version: 0.1.0
priority: high
depends_on:
  - spec_01KJNEM5ACB1KCGX40NYRDTW24
---

# Budget auto-pause: pause runs at budget limit instead of failing, with notification and easy resume

## Goal

When a build hits its budget limit, pause gracefully instead of hard-failing. Preserve all in-progress work — worktrees, agent state, partial builds. Notify the user. Make it trivial to resume with more budget via `dark continue --budget-usd <more>`. Budget limits should be guardrails, not cliff edges.

## Problem

Today when a build exceeds its budget, the run fails. Failed runs clean up agent state. If a build was 80% done and hit the budget, all that progress is lost — the user has to restart from scratch. This is wasteful and punitive. The correct behavior is to pause: stop spending money, keep everything intact, and let the user decide whether to add budget and continue.

## Requirements

### Module 1: Budget Monitoring in Pipeline Engine

- The pipeline engine (`src/pipeline/engine.ts`) already tracks cost per run via heartbeat polling
- Add a budget check after each cost update:
  - If cost >= 80% of `--budget-usd`: emit `budget-warning` event, log a warning, continue execution
  - If cost >= 100% of `--budget-usd`: trigger the pause sequence (Module 2)
- Budget check frequency: every heartbeat cycle (same as cost tracking — no new polling needed)
- If no `--budget-usd` is set, skip all budget checks (no default budget)

### Module 2: Pause Sequence

When budget is exceeded:

1. **Mark run as paused**: Set `runs.status = 'paused'` in the database, record `paused_at` timestamp and `pause_reason = 'budget_exceeded'`
2. **Signal active agents**: Send `SIGTSTP` to all running agent processes (suspends but doesn't kill). If SIGTSTP is not supported or the process doesn't respond within 5 seconds, send `SIGSTOP`.
3. **Preserve agent state**: Do NOT clean up worktrees. Do NOT delete agent records. Do NOT archive the run. Everything stays in place.
4. **Record agent positions**: For each active agent, store: current phase, current module (if building), last completed step. This goes in a `run_pause_state` table or JSON blob in the run record.
5. **Console output**:
   ```
   [dark] Run paused: budget $15.00 reached ($14.87 spent).
   Resume with: dark continue <run-id> --budget-usd 25
   ```
6. **Emit event**: `run-paused` event with run ID, cost, and reason — picked up by the notification system if configured

### Module 3: Resume from Pause

- `dark continue <run-id> --budget-usd <new-total>` resumes a paused run
- The new budget replaces the old one (it's a new total, not an increment)
- Resume sequence:
  1. Validate the run is in `paused` state
  2. Validate new budget > current spend
  3. Set `runs.status = 'running'`, clear `paused_at`
  4. Send `SIGCONT` to suspended agent processes (if still alive)
  5. If agent processes are gone (machine rebooted, etc.), restart them using the stored pause state — same module, same phase, same worktree
  6. Pipeline engine picks up where it left off using the existing resume logic (`src/pipeline/resume.ts`)
- If a paused run's worktrees have been manually deleted, the resume should fail with a clear error: "Worktrees for this run were removed. Start a new build."

### Module 4: 80% Budget Warning

- At 80% of budget, log a visible warning:
  ```
  [dark] Budget warning: $12.00 of $15.00 spent (80%). Build will pause at $15.00.
  ```
- The warning is logged once per threshold crossing (not on every heartbeat)
- If notifications are configured, send a `budget-warning` notification
- Build continues past 80% — the warning is informational only

### Module 5: Dashboard Integration

- Paused runs appear in the dashboard with a distinct visual treatment:
  - Yellow/amber status badge: "Paused"
  - Reason shown below the badge: "Budget limit reached ($14.87 / $15.00)"
  - "Add Budget" button that pre-fills a `dark continue` command (or, if the spec editor exists, a UI form)
- Paused runs are NOT grouped with failed runs — they're a separate state
- Run timeline shows the pause event as a milestone marker

### Module 6: Manual Pause (Bonus)

- `dark pause <run-id>` — manually pause a running build (same sequence as auto-pause, but `pause_reason = 'manual'`)
- `dark pause` (no run-id) — pause the most recent active run
- This uses the same pause/resume infrastructure, just with a different trigger
- Console output: `[dark] Run <id> paused manually. Resume with: dark continue <id>`

## Scenarios

### Functional

1. **Auto-pause on budget**: Set `--budget-usd 2`, start a build that costs more. Verify the run transitions to `paused` (not `failed`) at approximately $2 spent.

2. **Resume after pause**: Pause a run via budget. Run `dark continue <run-id> --budget-usd 10`. Verify the run resumes from where it left off — does not restart modules that were already completed.

3. **Worktrees preserved on pause**: Pause a run mid-build. Verify builder worktrees still exist on disk in `.df/runs/<run-id>/worktrees/` with uncommitted code from the in-progress module.

4. **80% budget warning**: Set `--budget-usd 10`, run a build. Verify a warning is logged when cost crosses ~$8. Verify the build continues past the warning.

5. **Dashboard shows paused run**: Pause a run. Open the dashboard. Verify the run shows a yellow "Paused" badge with the budget reason and an "Add Budget" action.

6. **Resume with insufficient budget**: Pause a run at $14.87 spent. Try `dark continue --budget-usd 14`. Verify it rejects with "New budget ($14) must exceed current spend ($14.87)."

7. **Manual pause**: Start a build. Run `dark pause <run-id>`. Verify it pauses the same way as auto-pause — agents suspended, state preserved, resume available.

8. **Pause does not corrupt state**: Pause a run, resume it, let it complete. Verify all scenarios pass — the pause/resume cycle didn't introduce data corruption or missed modules.

### Changeability

1. **Change warning threshold**: Changing the warning from 80% to 90% should require updating a single constant or config value — no logic changes.

2. **Add per-module budgets**: Adding budget limits per module (not just per run) should require adding a budget field to the module record and a check in the builder agent — the pause/resume infrastructure stays the same.
