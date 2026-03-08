---
name: content-hash-duplicated-in-two-files
type: change
spec_id: run_01KK6J195CBPQR35EVQ13YJ2J1
created_by: agt_01KK6NRZ2KMXYSHE6YA1PV0PC9
---

CHANGE SCENARIO: computeContentHash is defined independently in build-guards.ts and db/queries/spec-extensions.ts. Both use createHash('sha256'). PASS CRITERIA: computeContentHash exists in exactly 1 file. FAIL CRITERIA: computeContentHash defined in 2+ files requiring parallel updates when changing algorithm.