---
name: status-shows-spec-title-and-modules
type: functional
spec_id: run_01KK6QXFCV1988195YMPGM2QCS
created_by: agt_01KK6QXFCW27WCTXH47YAQPC0D
---

PRECONDITION: A run exists with spec_id pointing to a spec in the specs table that has a title. The run has an active buildplan with 3+ modules, and agents assigned to some modules (mix of completed and running).

STEPS:
1. Run: dark status --run-id <run-id>

EXPECTED OUTPUT (in addition to existing fields):
  Run: run_01XXXXX
    Spec:      spec_01XXXXX (Enrich CLI output: never need raw sqlite)
    Status:    running
    Phase:     build
    Iteration: 1/3
    Cost:      $1.33 / $15.00
    Tokens:    50,234
    Agents:    2 active, 1 completed, 2 dead
    Modules:   merge-lock(done) engine-rebase(building 12m 34s) queue-vis(building 11m 0s)

PASS CRITERIA:
- Spec title shown in parentheses after spec ID
- Module progress line shows each module with status label (done/building/pending/failed)
- Building modules show elapsed time
- Agent count is broken down into active/completed/dead (not just 'active/total')
- If spec has no title in DB, just show spec ID without parentheses