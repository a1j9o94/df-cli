---
name: build-unblocks-dependent
type: functional
spec_id: run_01KK7R4Y6S9X8AQA0BPDTRZ039
created_by: agt_01KK7R4Y6VS8TXZ8FQ3TWGRQTG
---

PRECONDITION: Spec A (draft, no deps) and Spec B (draft, depends_on A).

STEPS:
1. Run: dark spec ready — verify A is listed, B is NOT
2. Run: dark spec blocked — verify B is listed with blocker=A
3. Simulate A reaching 'completed' status: update spec A status to completed in DB
4. Run: dark spec ready — verify B is NOW listed
5. Run: dark spec blocked — verify B is NOT listed

EXPECTED:
- After A completes, B transitions from blocked to ready
- getReadySpecs(db) returns B after A is completed
- getBlockedSpecs(db) no longer returns B

PASS/FAIL:
- PASS if B appears in ready after A completes
- FAIL if B remains blocked after A completes, or if B was ready before A completed