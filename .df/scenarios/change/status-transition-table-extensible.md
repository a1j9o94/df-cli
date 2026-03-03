---
name: status-transition-table-extensible
type: change
spec_id: run_01KJSRR01K5PXP0JVNMG3RYM19
created_by: agt_01KJT3FJ21XE3DSRTB8EDM5P27
---

Changeability test: Adding a new valid status transition (e.g., 'completed->reopened') should require modifying exactly ONE data structure - the VALID_TRANSITIONS set in build-guards.ts. VERIFICATION: 1. Read build-guards.ts and confirm VALID_TRANSITIONS is a ReadonlySet of strings like 'from->to'. 2. Adding 'completed->reopened' requires adding one entry to this set. 3. validateStatusTransition() derives its behavior entirely from VALID_TRANSITIONS. 4. No other file needs to know about the new transition. PASS CRITERIA: Adding a new transition is a 1-line change to VALID_TRANSITIONS. No changes needed to engine.ts, spec commands, or any other file. FAIL CRITERIA: The transition logic is split across multiple files or hardcoded in engine.ts.