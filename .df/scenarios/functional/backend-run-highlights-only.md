---
name: backend-run-highlights-only
type: functional
spec_id: run_01KK7SEJD8Z1CHN7Z2B1ZDT9P9
created_by: agt_01KK7SEJD9V7MRX6KC86N28S5K
---

PRECONDITIONS: A completed run exists whose spec title is 'Add rate limiting to API endpoints' (no visual keywords). The run produced agent logs with module creation events, test pass/fail events, and decision lines.

STEPS:
1. Open the dashboard and navigate to this run's detail view.
2. Click the Output tab.
3. Verify NO screenshot gallery is displayed (this is not a visual run).
4. Verify curated log highlights are displayed as a structured list.
5. Verify highlights include entries of types: module_created, scenario_passed, scenario_failed, key_decision, error_recovery, integration.
6. Verify highlights do NOT include raw Claude reasoning text, token counts, or internal agent coordination messages.
7. Verify a 'Modules' summary section shows per-module cards with: module name, description, files created/modified, tests passing count, key decisions, build duration.

EXPECTED:
- Output tab shows highlights and module summaries, not screenshot gallery.
- Highlights are filtered and structured, not raw logs.
- Each highlight has type, timestamp, and relevant metadata.

PASS CRITERIA:
- highlights.json exists at .df/runs/<run-id>/highlights.json
- highlights.json contains only curated event types (module_created, scenario_passed, scenario_failed, key_decision, error_recovery, integration)
- No raw Claude output appears in highlights
- Module summary cards render with correct data