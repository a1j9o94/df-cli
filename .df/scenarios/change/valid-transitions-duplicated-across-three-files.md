---
name: valid-transitions-duplicated-across-three-files
type: change
spec_id: run_01KK6D0A338WWPKA9YNGG3S1WB
created_by: agt_01KK6FRE2SYYF08YWK5EWPH8JZ
---

CHANGE SCENARIO: VALID_TRANSITIONS is defined independently in THREE separate files: (1) src/pipeline/build-guards.ts:14 as ReadonlySet<string> for spec status transitions, (2) src/db/queries/spec-lineage.ts:12 as Record<SpecStatus, Set<SpecStatus>>, (3) src/db/queries/spec-transitions.ts:18 as Record<SpecStatus, SpecStatus[]>. Each has its own definition with different data structures. Adding a new spec status transition requires updating all three. VERIFICATION: grep VALID_TRANSITIONS across src/. PASS: A single VALID_TRANSITIONS source is imported by all consumers. FAIL: 2+ files define their own transition rules independently.