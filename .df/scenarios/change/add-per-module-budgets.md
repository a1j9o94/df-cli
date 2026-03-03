---
name: add-per-module-budgets
type: change
spec_id: run_01KJSXZQ59YSWAH7RS1JQ7KVV4
created_by: agt_01KJSXZQ5ACJCQDQWNCZXC07WN
---

## Add per-module budgets

### Modification
Add budget limits per module (not just per run). Each module in the buildplan can have an optional budget_usd field. When a builder exceeds its module budget, it should trigger the same pause infrastructure.

### Expected Effort
- Add a budget_usd field to module definitions in the buildplan schema
- Add a budget check in the builder agent lifecycle (build-phase.ts or agent-lifecycle.ts)
- The pause/resume infrastructure should stay the same — reuse pauseRun() with a different trigger
- Estimated: 2-3 files touched, ~30 lines added

### Affected Areas
- Buildplan module schema (src/types/buildplan.ts or wherever modules are defined)
- Builder agent monitoring in build-phase.ts
- The pause mechanism itself should NOT need changes (just called from a new location)

### Verification
1. Add budget_usd to a module in a buildplan
2. Start a build where a module exceeds its budget
3. Verify the run pauses with a module-specific reason
4. Verify the pause/resume flow works the same as run-level budget pause

### Pass Criteria
- pauseRun() function is reusable without modification for module-level budget triggers
- The pause_reason can distinguish between run-level and module-level budget causes
- Adding per-module budgets requires NO changes to pause.ts, resume.ts, continue.ts, or the dashboard
- Only changes needed: buildplan type + builder budget check