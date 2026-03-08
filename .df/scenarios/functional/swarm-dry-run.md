---
name: swarm-dry-run
type: functional
spec_id: run_01KK7R4Y6S9X8AQA0BPDTRZ039
created_by: agt_01KK7R4Y6VS8TXZ8FQ3TWGRQTG
---

PRECONDITION: Five specs with mixed dependencies:
- A: no deps (draft)
- B: depends_on [A] (draft)
- C: no deps (draft)
- D: depends_on [B, C] (draft)
- E: status=completed (already done)

STEPS:
1. Run: dark swarm --dry-run

EXPECTED OUTPUT:
- Shows execution plan WITHOUT actually building anything
- Groups specs by layer/phase:
  - Phase 1: A, C (no unmet deps, both ready)
  - Phase 2: B (depends on A only, A is in phase 1)
  - Phase 3: D (depends on B and C)
- E is NOT shown (already completed)
- No runs are created in the runs table
- No spec statuses change
- No agents are spawned

VERIFICATION:
- Count runs in DB before and after: should be identical
- All spec statuses unchanged after dry-run

PASS/FAIL:
- PASS if plan is displayed correctly and no side effects occur
- FAIL if specs are built, statuses change, or order is wrong