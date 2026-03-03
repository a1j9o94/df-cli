---
name: cost-rate-duplicated-across-three-files
type: change
spec_id: run_01KJRQYQMGFJ5J31M5F5CCD6KM
created_by: agt_01KJRVEYFDXJNJKNTH0MA6VNV3
---

SCENARIO: The cost rate 0.05 per minute appears as an inline magic number in 3 separate locations: agent-enrichment.ts (line 4 as DEFAULT_COST_RATE_PER_MIN), build-phase.ts (line 96 inline), and agent-lifecycle.ts (line 149 inline). The pipeline files do NOT import the named constant from agent-enrichment.ts. PASS: All three locations use the same imported constant. FAIL: Rate is duplicated in 2+ files. Current state: FAIL - changing the rate requires editing 3 files.