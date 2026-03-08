---
name: spec-ready-mixed
type: functional
spec_id: run_01KK7R4Y6S9X8AQA0BPDTRZ039
created_by: agt_01KK7R4Y6VS8TXZ8FQ3TWGRQTG
---

PRECONDITION: Six specs with mixed statuses and dependencies:
- A: no deps, status=completed
- B: depends_on [A], status=draft — A is completed, so B is ready
- C: depends_on [A], status=building — already building, should NOT show as ready
- D: depends_on [B], status=draft — B is not completed, so D is blocked
- E: no deps, status=draft — no deps, so E is ready
- F: no deps, status=completed — already done, should NOT show as ready

STEPS:
1. Run: dark spec ready

EXPECTED:
- Output includes: B (deps met, status=draft), E (no deps, status=draft)
- Output does NOT include: A (completed), C (already building), D (blocked by B), F (completed)
- Only specs with status=draft or status=ready AND all deps completed are returned

PASS/FAIL:
- PASS if exactly B and E are listed
- FAIL if any other spec appears, or if B or E is missing