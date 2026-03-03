---
name: add-new-pipeline-phase
type: change
spec_id: run_01KJRX3A8RQ828EWHYSSWYPAZ6
created_by: agt_01KJRX3A8S4J1J5RNG8QZ4XGAH
---

MODIFICATION: Add a new pipeline phase 'code-review' between 'build' and 'integrate'.

DESCRIPTION:
A new pipeline phase called 'code-review' needs to be added to the pipeline. This phase runs after all builders complete and before integration testing. The dashboard should display this new phase in the timeline without requiring changes beyond:
1. Adding the phase to PHASE_ORDER in src/pipeline/phases.ts
2. Adding any skip logic if needed

AFFECTED AREAS:
- src/pipeline/phases.ts — Add 'code-review' to PhaseName type and PHASE_ORDER array
- src/dashboard/index.ts — Phase timeline rendering should auto-adapt (no changes needed if it reads from an API)
- src/dashboard/server.ts — Phases endpoint should auto-derive from PHASE_ORDER (no changes needed if implementation is data-driven)

EXPECTED EFFORT:
- If the dashboard phase timeline is data-driven (reads phases from the API which reads from PHASE_ORDER): Only 1 file change (phases.ts). This is the DESIRED outcome.
- If the dashboard hardcodes phase names: Multiple files need updating. This indicates poor changeability.

PASS CRITERIA:
- Adding a new phase to PHASE_ORDER automatically makes it appear in the dashboard phase timeline
- No hardcoded phase lists in the dashboard HTML/JS that would need manual updating
- The phases API endpoint dynamically uses PHASE_ORDER, not a hardcoded list