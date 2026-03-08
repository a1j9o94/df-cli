---
name: backend-run-highlights-only
type: functional
spec_id: run_01KK7R4Y1NWJRH426C68FK58CZ
created_by: agt_01KK7R4Y1TEX0SQCM76106T1F2
---

Preconditions: A completed run exists for a spec titled 'REST API authentication middleware' (no visual keywords). The run has highlights.json in .df/runs/<run-id>/ with at least 3 highlight events of different types. No screenshots directory exists.

Steps:
1. GET /api/runs/<run-id>/screenshots — expect 200 with empty array or 404
2. GET /api/runs/<run-id>/highlights — expect 200 with JSON array of highlight events
3. Load dashboard and navigate to run detail view
4. Click the 'Output' tab
5. Verify NO screenshot gallery is shown (no visual content)
6. Verify curated log highlights are displayed as a timeline/list
7. Verify each highlight shows: event type icon/badge, description, timestamp, module name
8. Verify highlight types rendered: module_created, scenario_passed, scenario_failed, key_decision, error_recovery, integration
9. Verify module summary cards are shown with: module name, description, files list, test count, key decisions, build duration

Pass criteria:
- Output tab shows highlights timeline and module summaries
- No screenshot gallery rendered
- Each highlight event type is visually distinct (badge/icon)
- Module summary cards contain all required fields

Fail criteria:
- Output tab shows screenshot gallery placeholder for non-visual run
- Highlights missing or showing raw agent output
- Module summaries missing