---
name: add-new-tab-changeability
type: change
spec_id: run_01KJNFM10CHHWZV5TVPXKE50XR
created_by: agt_01KJNFM10EV9BXZCJNZKFZEN7F
---

MODIFICATION: Add a new 'Timeline' tab to the dashboard, following the same pattern as existing tabs. EXPECTED CHANGES: 1. Add a tab button in the tab-bar div: <button class='tab' data-tab='timeline'>Timeline</button> 2. Add a panel div: <div class='tab-panel' id='timeline-panel'> 3. Add a render function: function renderTimeline(events) { ... } 4. Add a fetch call: function loadTimeline(runId) { return fetchJson('/api/runs/' + runId + '/events'); } 5. Wire up the fetch in the selectRun function alongside existing loadAgents/loadModules calls. AFFECTED AREAS: - src/dashboard/index.ts: generateDashboardHtml function (HTML template), generateScript function (JS logic) - Tests: tests/unit/dashboard/generate-html.test.ts (add test for timeline tab presence) EXPECTED EFFORT: Small — follows existing tab pattern. Should require adding ~30-50 lines of code across template and script sections, plus ~5-10 lines of tests. No new API endpoints needed (reuses /events). PASS CRITERIA: - Adding a Timeline tab follows the identical pattern used by Overview, Modules, and Validation tabs - The tab switching mechanism (data-tab attribute + panel ID convention) is reused without modification - No changes to server.ts or API layer required