---
name: cost-rate-defined-in-four-independent-files
type: change
spec_id: run_01KK5Q781KAW2BENBFBHQC3DCE
created_by: agt_01KK5QSCQ40PCWYRANGB212A2V
---

CHANGE SCENARIO: The cost rate 0.05 appears as independently defined constants in at least 4 files: agent-enrichment.ts (DEFAULT_COST_RATE_PER_MIN), budget.ts (DEFAULT_COST_PER_MINUTE), cost.ts (inline), and types/config.ts (DEFAULT_COST_CONFIG and DEFAULT_CONFIG). None import from a shared source. VERIFICATION: grep -r '0.05' across src/ and count unique defining files. PASS: All files import rate from a single shared constant. FAIL: Rate defined in 4+ independent locations.