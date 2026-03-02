---
name: from-phase-unsafe-cast-no-validation
type: change
spec_id: run_01KJQERB5P8DCWZJXCZR5Z64BW
created_by: agt_01KJQPSYMK3FZ6E1ZPBBKYXYG0
---

CHANGEABILITY SCENARIO: continue.ts line 80 casts options.fromPhase directly to PhaseName with 'as' cast — no runtime validation. Invalid strings like 'foo' pass through to the engine. CLI should validate against PHASE_ORDER before calling engine.resume(). VERIFICATION: Read continue.ts line 80 — 'as PhaseName | undefined' cast with no PHASE_ORDER check. No Commander .choices() or manual validation. PASS CRITERIA: PASS if continue.ts imports PHASE_ORDER and validates --from-phase before engine.resume(). FAIL (expected) if --from-phase accepts arbitrary strings via unsafe cast.