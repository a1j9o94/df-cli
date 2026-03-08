---
name: api-partial-merge
type: functional
spec_id: run_01KK7R4Y00QTYW313JFYCM7YTJ
created_by: agt_01KK7R4Y02HV5WA517GHC8FYHE
---

PRECONDITION: Dashboard running, config has max_parallel=4, budget_usd=50, satisfaction=0.8. STEPS: 1. PUT /api/config with body {"build":{"max_parallel":2}}. 2. Verify response status is 200. 3. Verify response body contains the FULL merged config (not just the changed field). 4. Verify response shows build.max_parallel=2. 5. Verify response shows build.budget_usd=50 (unchanged). 6. Verify response shows thresholds.satisfaction=0.8 (unchanged). 7. GET /api/config. 8. Verify response matches the PUT response. 9. Read .df/config.yaml directly. 10. Verify the YAML has build.max_parallel=2 and all other fields intact. 11. Test nested merge: PUT /api/config with {"thresholds":{"satisfaction":0.9}}. Verify changeability threshold is preserved at 0.6. PASS CRITERIA: Partial updates deep-merge correctly, never overwrite sibling fields, response always returns full merged config.