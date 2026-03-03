---
name: no-sqlite-needed-lifecycle
type: functional
spec_id: run_01KJSXZQ1WDY0A0JVRTZPNB3AW
created_by: agt_01KJSXZQ1X0E7M9WZA7R77WKY6
---

SCENARIO: Complete build lifecycle can be monitored without ever opening sqlite.

PRECONDITIONS:
- A fresh run that will go through: build phase -> at least one builder fails -> resume -> complete.

STEPS (monitoring sequence, all using CLI commands only):
1. Start monitoring: dark status
   VERIFY: Shows run ID, spec title, phase, cost.
2. During build phase: dark agent list
   VERIFY: Shows all active builders with elapsed time, cost, worktree path, heartbeat.
3. Check specific builder: dark agent show <builder-id>
   VERIFY: Shows full detail including events (spawned, heartbeat) and any messages received.
4. After a builder fails: dark agent list --active
   VERIFY: Failed builder is excluded. Only active builders remain.
5. After resume with new builder: dark agent list
   VERIFY: Shows latest agent per module (new retry, not old failed one).
6. During build: dark status --run-id <run-id>
   VERIFY: Shows per-module progress (some done, some building, some pending).
7. After all builders complete: dark status
   VERIFY: All modules show done status. Agent breakdown shows X completed, 0 active.

KEY INFORMATION THAT MUST BE AVAILABLE VIA CLI:
- Worktree path for any builder (dark agent list or dark agent show)
- Files changed by a builder (dark agent list shows file count)
- Why an agent failed (dark agent show shows error field)
- Which module each builder is working on (dark agent list shows module=X)
- How much each agent has cost (dark agent list or dark agent show shows cost)
- Overall run cost and budget remaining (dark status shows cost/budget)
- Mail received by an agent (dark agent show shows messages section)

PASS CRITERIA:
- ALL information listed above is accessible through dark status, dark agent list, or dark agent show.
- No step requires running sqlite3 .df/state.db to get needed information.
- Each command produces non-empty, formatted output with the relevant data fields.