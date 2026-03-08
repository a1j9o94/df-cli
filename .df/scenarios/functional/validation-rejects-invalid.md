---
name: validation-rejects-invalid
type: functional
spec_id: run_01KK7R4Y00QTYW313JFYCM7YTJ
created_by: agt_01KK7R4Y02HV5WA517GHC8FYHE
---

PRECONDITION: Dashboard running with valid config. STEPS: 1. Open Settings tab. 2. Set Budget cap to -5. 3. Click Save. 4. Verify save is REJECTED - no changes written to .df/config.yaml. 5. Verify an inline validation error appears next to the Budget cap field (e.g., 'Budget must be positive'). 6. Also test via API directly: PUT /api/config with body {"build":{"budget_usd":-5}}. 7. Verify API returns 400 status with error message. 8. Verify .df/config.yaml is unchanged. 9. Additional invalid values to test: max_parallel=0, max_parallel=20 (>16), satisfaction=1.5 (>1.0), satisfaction=-0.1 (<0), heartbeat_timeout=0, max_iterations=0, max_iterations=11 (>10). PASS CRITERIA: All invalid values rejected with specific error messages, config file never modified with invalid data.