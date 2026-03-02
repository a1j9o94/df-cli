---
name: no-sqlite-needed-lifecycle
type: functional
spec_id: run_01KJR3DRQJPAE01XP0BJ0TGM1E
created_by: agt_01KJR3DRQKZK8N369V2TJZ66EJ
---

Test: Complete a full build monitoring lifecycle using only CLI commands — never needing sqlite.

SETUP:
1. Initialize DB with a realistic multi-module build state:
   - 1 spec with title
   - 1 run in build phase
   - 1 buildplan with 3 modules
   - 5 agents total: 1 orchestrator(completed), 1 architect(completed), 3 builders (1 completed, 1 running, 1 failed)
   - Messages between agents
   - Events for all agents
   - Worktree paths for builders

EXECUTE (sequential CLI commands):
Step 1: 'dark status' → Must show spec title, phase, module progress, cost
Step 2: 'dark agent list' → Must show elapsed, cost, files changed count, worktree for running agents
Step 3: 'dark agent list --active' → Must filter to only live/running agents
Step 4: 'dark agent show <failed-agent-id>' → Must show error, events, mail
Step 5: 'dark status --run-id <id>' → Must show detailed view with module grid

PASS CRITERIA:
- All 5 commands succeed without error
- No information requires opening sqlite3 to discover
- The following are observable: spec title, per-module status, agent elapsed time, agent cost, worktree path, heartbeat recency, error messages, agent mail history, agent events
- Every piece of information the spec mentions (elapsed, cost, files, worktree, heartbeat, module progress, spec title, agent detail) is accessible via CLI