---
name: status-shows-module-progress
type: functional
spec_id: run_01KJSXZQ1WDY0A0JVRTZPNB3AW
created_by: agt_01KJSXZQ1X0E7M9WZA7R77WKY6
---

SCENARIO: dark status shows per-module build progress inline.

PRECONDITIONS:
- A run exists in the 'build' phase with an active buildplan containing at least 3 modules.
- Module states: at least one module has a completed builder, at least one has a running builder, at least one has no builder yet (pending).
- Buildplan modules have ids and titles defined.

STEPS:
1. Run: dark status --run-id <run_id>
2. Capture text output.

EXPECTED OUTPUT:
- A line or section showing per-module progress, with each module showing its status.
- Example format: 'modules: merge-lock(done) engine-rebase(building 12m) queue-vis(pending)'
- Or a multi-line module list showing moduleId/title + status for each.
- The status labels map: completed agent -> 'done', running agent -> 'building Xm', no agent -> 'pending', failed agent -> 'failed'.
- If an agent is running, elapsed time is shown alongside the building status.

AGENT COUNT BREAKDOWN:
- Output shows agents categorized: e.g., '2 active, 1 completed, 2 dead' instead of just '2/5'.
- The breakdown uses the categories: active (pending+spawning+running), completed, dead (failed+killed).

PASS CRITERIA:
- Output contains module-level status for ALL modules in the buildplan (count matches).
- At least one module shows 'done' or 'completed' status.
- At least one module shows 'building' or 'running' status with an elapsed time.
- At least one module shows 'pending' status.
- Agent summary shows active/completed/dead breakdown (not just ratio).