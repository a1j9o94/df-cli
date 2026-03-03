---
name: add-new-tab-changeability
type: change
spec_id: run_01KJT1DSECDSZP9V2JPPS48CRC
created_by: agt_01KJT1DSEEGBAKZSDD5AYGA6XR
---

CHANGE SCENARIO: Adding a new 'Timeline' tab should follow the same pattern as existing tabs.

MODIFICATION DESCRIPTION:
Add a new 'Timeline' tab to the dashboard that shows chronological events for a run.

EXPECTED PATTERN:
To add a Timeline tab, a developer should need to:
1. Add a tab button in the tab-bar HTML (e.g. <button class='tab' data-tab='timeline'>Timeline</button>)
2. Add a panel div in the HTML (e.g. <div class='tab-panel' id='timeline-panel'>)
3. Add a render function in the JavaScript (e.g. function renderTimeline(events) {...})
4. Add a fetch call in the JavaScript (e.g. fetchJson('/api/runs/' + runId + '/events'))
5. Wire up the tab click to show the panel (should be automatic via existing tab-switching logic)

AFFECTED AREAS:
- src/dashboard/index.ts: generateDashboardHtml (HTML template), generateScript (JS logic)
- No server.ts changes needed (events endpoint already exists)

EXPECTED EFFORT:
- The tab switching logic should be data-driven: adding data-tab='timeline' and id='timeline-panel' should automatically work with the existing click handler
- Adding a new tab should NOT require modifying the tab-switching event handler
- Total effort: ~30-50 lines of new code, no structural changes

PASS CRITERIA:
- The existing tab-switching click handler uses a generic pattern (e.g. e.target.dataset.tab + '-panel') not hardcoded tab names
- Adding a new tab button + panel div + render function is sufficient
- No modification to existing tabs or tab switching logic required