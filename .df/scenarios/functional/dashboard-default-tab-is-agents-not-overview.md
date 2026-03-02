---
name: dashboard-default-tab-is-agents-not-overview
type: functional
spec_id: run_01KJPFGY2T1DE169DE6RN9JA73
created_by: agt_01KJPKN1YNAXDMSCVEDTPT9V4P
---

SETUP: Generate dashboard HTML and inspect default tab selection. STEPS: 1. Read src/dashboard/index.ts and find the tab-bar HTML generation. 2. Identify which tab button has the CSS class 'active' by default. 3. Identify which tab-panel div has the 'active' class by default. 4. Check whether an 'Overview' tab exists at all. PASS CRITERIA: - An 'Overview' tab exists and is the default active tab - The Overview tab shows spec goal, module dependency visualization, and architecture summary - The Agents tab is NOT the default tab FAIL CRITERIA: - The 'Agents' tab is the default active tab - No 'Overview' tab exists in the dashboard - Users land on the Agents tab with no high-level context about the run