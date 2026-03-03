---
name: cost-rate-constant-not-duplicated-in-pipeline
type: change
spec_id: run_01KJRQYA4Z3QWJJ3C2ZX8DNPDM
created_by: agt_01KJRSVHVX3DZXYM8J0DKSDP86
---

CHANGE SCENARIO: The cost rate constant 0.05 is used in 3 separate locations: (1) agent-enrichment.ts DEFAULT_COST_RATE_PER_MIN, (2) build-phase.ts line 96 inline 0.05, (3) agent-lifecycle.ts line 149 inline 0.05. Changing the rate requires editing 3 files. EXPECTED: All cost estimation should use the exported estimateCost() from agent-enrichment.ts, or at minimum import the DEFAULT_COST_RATE_PER_MIN constant. PASS: Changing the rate requires modifying exactly 1 file (agent-enrichment.ts). FAIL: Rate is duplicated as inline magic number in build-phase.ts and agent-lifecycle.ts (current state).