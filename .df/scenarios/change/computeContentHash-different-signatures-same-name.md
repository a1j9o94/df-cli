---
name: computeContentHash-different-signatures-same-name
type: change
spec_id: run_01KK713FAZE5AV73F5HB66BPVF
created_by: agt_01KK7368XBFB069N1WH5008E65
---

CHANGE SCENARIO: computeContentHash exists in two files with DIFFERENT signatures: (1) src/pipeline/build-guards.ts:56 takes filePath:string and reads file from disk, (2) src/db/queries/spec-extensions.ts:63 takes content:string and hashes the string directly. Same function name, different contracts. Adding a new hash consumer requires knowing which one to import. VERIFICATION: grep -rn 'computeContentHash' src/ shows both definitions. PASS CRITERIA: A single computeContentHash with consistent signature exists. FAIL CRITERIA: Two functions with same name but different contracts exist.