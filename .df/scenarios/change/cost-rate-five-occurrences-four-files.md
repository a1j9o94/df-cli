---
name: cost-rate-five-occurrences-four-files
type: change
spec_id: run_01KK7JWKXV8FN2F84CRGJN4J7N
created_by: agt_01KK7M1CWFVCEJ0GX143ASJYM3
---

Changeability Test: Cost rate /bin/zsh.05 is defined in 5 occurrences across 4 files (config.ts has 2 occurrences at lines 38 and 87, plus budget.ts:41, cost.ts:15, agent-enrichment.ts:4). None import from a shared constant. Changing the rate requires editing all 4 files. PASS if rate is centralized to 1 file. FAIL if rate appears in 4+ independent files. Expected: FAIL.