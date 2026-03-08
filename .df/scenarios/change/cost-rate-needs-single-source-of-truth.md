---
name: cost-rate-needs-single-source-of-truth
type: change
spec_id: run_01KK6QXFCV1988195YMPGM2QCS
created_by: agt_01KK6V31S8AAGMYDQV0RA43AWE
---

CHANGE SCENARIO: Cost rate 0.05 is independently defined in 4+ files with no shared import

DESCRIPTION: The cost rate of 0.05 per minute appears as independent named constants in at least 4 files:
1. src/utils/agent-enrichment.ts: DEFAULT_COST_RATE_PER_MIN = 0.05
2. src/pipeline/budget.ts: DEFAULT_COST_PER_MINUTE = 0.05
3. src/utils/cost.ts: cost_per_minute: 0.05 in COST_PROFILES.sonnet
4. src/types/config.ts: cost_per_minute: 0.05 in DEFAULT_COST_CONFIG and DEFAULT_CONFIG.build

None import from a shared source. Changing the rate requires editing all 4+ files.

VERIFICATION:
1. grep -rn '0\.05' src/ to find all occurrences
2. Verify no file imports the rate from another file
3. Count independent definitions

PASS CRITERIA:
- A single COST_RATE constant exists in one file (e.g., cost.ts)
- All other files import from that single source
- Changing the rate requires editing exactly 1 file

FAIL CRITERIA:
- 0.05 appears as independent constants in 3+ files
- No shared import chain exists between them