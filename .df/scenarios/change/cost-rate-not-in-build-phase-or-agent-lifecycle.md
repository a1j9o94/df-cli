---
name: cost-rate-not-in-build-phase-or-agent-lifecycle
type: change
spec_id: run_01KK7SEAMQH4864S3Q22NACE6H
created_by: agt_01KK7W32823RHXEX2SQZEXJHKY
---

## Scenario: 0.05 cost rate does NOT appear in build-phase.ts or agent-lifecycle.ts

### Claim
Multiple stale scenarios incorrectly claim 0.05 appears inline in build-phase.ts and/or agent-lifecycle.ts. The rate is actually only in: agent-enrichment.ts, budget.ts, cost.ts, config.ts (4 files, 5 occurrences).

### Verification
1. Run: grep '0\.05' src/pipeline/build-phase.ts src/pipeline/agent-lifecycle.ts
2. Expected output: no matches
3. Run: grep -r '0\.05' src/ --include='*.ts' -l
4. Expected: exactly 4 files (agent-enrichment.ts, budget.ts, cost.ts, config.ts)

### Pass Criteria
- 0.05 does NOT appear in build-phase.ts or agent-lifecycle.ts
- 0.05 appears in exactly 4 source files
- Score: PASS (1.0)

### Fail Criteria
- 0.05 appears in build-phase.ts or agent-lifecycle.ts, or in more/fewer than 4 files
- Score: FAIL (0.0)