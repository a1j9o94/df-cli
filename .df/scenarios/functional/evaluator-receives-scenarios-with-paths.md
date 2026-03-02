---
name: evaluator-receives-scenarios-with-paths
type: functional
spec_id: run_01KJP6GK3B3RYANRP51CFYXDF7
created_by: agt_01KJP6GK3CC8RV8Q8WDC17DRVD
---

PRECONDITIONS: A pipeline run has reached the evaluator phase. At least 2 holdout scenarios exist in .df/scenarios/functional/ (e.g., scenario-a.md, scenario-b.md).

STEPS:
1. Inspect the mail message sent to the evaluator agent.
2. Look for a Scenarios section in the mail body.
3. Verify each scenario includes:
   - Scenario name
   - Scenario type (functional or change)
   - Full file path (e.g., .df/scenarios/functional/scenario-a.md)
   - Scenario content or at minimum a summary

EXPECTED OUTPUT:
- The mail body lists each scenario with its full file path.
- Paths are absolute or project-relative, not just 'load from .df/scenarios/'.

PASS CRITERIA:
- Every scenario file in .df/scenarios/ appears in the mail with its path.
- Each scenario entry includes the file path (not just 'see .df/scenarios/').
- The evaluator does NOT need to run 'dark scenario list' to discover scenarios — they are pre-loaded in the mail.

FAIL CRITERIA:
- Mail says 'Scenarios are in .df/scenarios/functional/ and .df/scenarios/change/' without listing them.
- Scenario names appear without file paths.
- Any existing scenario is missing from the mail.