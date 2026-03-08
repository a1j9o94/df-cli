---
name: agent-exclusion-fields-centralized-in-format-ts
type: change
spec_id: run_01KK7SEAMQH4864S3Q22NACE6H
created_by: agt_01KK7W32823RHXEX2SQZEXJHKY
---

## Scenario: AGENT_DEFAULT_EXCLUDED_FIELDS is centralized in format.ts

### Claim
Several scenarios incorrectly claim field exclusion is per-command or nonexistent. AGENT_DEFAULT_EXCLUDED_FIELDS is defined ONCE in src/utils/format.ts and imported by agent/list.ts, agent/show.ts, and status.ts.

### Verification
1. Run: grep -r 'AGENT_DEFAULT_EXCLUDED_FIELDS' src/ --include='*.ts'
2. Expected: defined in format.ts, imported in list.ts, show.ts, status.ts
3. Verify formatJson() has excludeFields parameter

### Pass Criteria
- Single definition in format.ts
- 3 imports (list.ts, show.ts, status.ts)
- Score: PASS (1.0)

### Fail Criteria
- Multiple definitions or missing imports
- Score: FAIL (0.0)