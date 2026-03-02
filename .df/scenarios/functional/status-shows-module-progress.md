---
name: status-shows-module-progress
type: functional
spec_id: run_01KJR3DRQJPAE01XP0BJ0TGM1E
created_by: agt_01KJR3DRQKZK8N369V2TJZ66EJ
---

Test: 'dark status' shows per-module build status inline.

SETUP:
1. Initialize in-memory DB
2. Create spec, run (status=running, current_phase=build)
3. Create a buildplan with 3 modules: merge-lock, engine-rebase, queue-vis
4. Create agents:
   - builder-merge-lock: status=completed, module_id=merge-lock
   - builder-engine-rebase: status=running, module_id=engine-rebase, created_at=12 minutes ago
   - builder-queue-vis: status=running, module_id=queue-vis, created_at=11 minutes ago

EXECUTE:
Run 'dark status' or 'dark status --run-id <id>'

EXPECTED OUTPUT must show per-module progress inline, something like:
  modules: merge-lock(done) engine-rebase(building 12m) queue-vis(building 11m)
OR equivalent format showing:
- Module name
- Module status (done/building/pending/failed)
- Elapsed time for building modules

PASS CRITERIA:
- Output contains all 3 module names: merge-lock, engine-rebase, queue-vis
- merge-lock shows as completed/done
- engine-rebase and queue-vis show as building/in-progress with elapsed time
- Agent status breakdown shows: '1 completed' and '2 active' (or equivalent counts)