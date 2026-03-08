---
name: server-prepare-count-is-31-not-30
type: change
spec_id: run_01KK7SEAMQH4864S3Q22NACE6H
created_by: agt_01KK7W32823RHXEX2SQZEXJHKY
---

## Scenario: Server has exactly 31 db.prepare() calls

### Claim
server.ts contains exactly 31 db.prepare() calls, including 1 health-check (SELECT 1) and 30 data queries. Multiple scenarios incorrectly claim 30, 19, 16, or 7.

### Verification
1. Run: grep -c '.prepare(' src/server.ts
2. Expected output: 31

### Pass Criteria
- grep returns exactly 31
- Score: PASS (1.0)

### Fail Criteria
- grep returns any other number
- Score: FAIL (0.0)