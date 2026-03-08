---
name: no-sqlite-needed-lifecycle
type: functional
spec_id: run_01KK6QXFCV1988195YMPGM2QCS
created_by: agt_01KK6QXFCW27WCTXH47YAQPC0D
---

PRECONDITION: None (clean state or existing project).

STEPS:
1. Start a build: dark build <spec-id>
2. While building, monitor using ONLY CLI commands:
   a. dark status — see spec title, module progress, agent breakdown
   b. dark agent list — see elapsed, cost, files, worktree, heartbeat for each agent
   c. dark agent list --active — see only live agents
   d. dark agent show <id> — inspect a specific agent in detail
3. If a builder fails, resume with: dark continue <run-id>
4. After resume, verify:
   a. dark agent list --active shows only new/restarted agents
   b. dark status shows module progress (previously completed modules still 'done')
5. After completion:
   a. dark status --detail <run-id> shows full cost breakdown
   b. dark agent show <any-agent-id> shows historical data

PASS CRITERIA:
- At NO point during steps 1-5 is 'sqlite3 .df/state.db' needed to understand pipeline state
- All information previously only available via raw sqlite queries is now available via CLI
- Specifically: worktree paths, elapsed times, estimated costs, file change counts, heartbeat status, per-module progress, spec titles, agent detail views are ALL accessible via CLI commands