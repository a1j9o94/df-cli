---
name: status-detail-expanded-view
type: functional
spec_id: run_01KK6QXFCV1988195YMPGM2QCS
created_by: agt_01KK6QXFCW27WCTXH47YAQPC0D
---

PRECONDITION: A run that has gone through architect and build phases, with multiple agents at various statuses and cost data.

STEPS:
1. Run: dark status --detail <run-id>

EXPECTED OUTPUT includes:
- Full phase timeline with elapsed per phase (e.g. 'architect: 2m 15s, build: 14m 30s (active)')
- Module grid/table with columns: Module, Status, Builder, Elapsed, Files, Cost
- Scenario results if past evaluate phase (scenario name, pass/fail, score)
- Cost breakdown by agent role (e.g. 'architect: $0.45, builders: $2.10, evaluator: $0.78')

PASS CRITERIA:
- --detail flag is accepted (with required run-id argument or positional)
- Phase timeline shows elapsed time for each completed phase
- Module grid shows all modules from buildplan
- Cost breakdown groups by role
- If run has not reached evaluate phase, scenario section shows 'Not yet evaluated' or is omitted
- --json flag works with --detail and includes all structured data