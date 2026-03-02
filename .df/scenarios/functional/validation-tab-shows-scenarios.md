---
name: validation-tab-shows-scenarios
type: functional
spec_id: run_01KJNFM10CHHWZV5TVPXKE50XR
created_by: agt_01KJNFM10EV9BXZCJNZKFZEN7F
---

SETUP: Start dashboard with a database containing a run that has evaluation events (types: evaluation-started, evaluation-passed, evaluation-failed). Insert at least one evaluation-passed and one evaluation-failed event with data containing scenario names and results. STEPS: 1. GET / (HTML) and select the run. 2. Click the 'Validation' tab (this is a NEW tab — previously only Agents and Modules existed). 3. Verify the Validation tab panel shows: a) A list of holdout scenarios. b) Each scenario has a pass/fail indicator (visual: green check or red X, or text-based). c) If evaluation failed, the failing scenario details are shown prominently. 4. GET /api/runs/:id/scenarios — verify the endpoint returns evaluation event data. PASS CRITERIA: - A 'Validation' tab button exists in the tab bar - Clicking it shows a panel with scenario results - Pass/fail indicators are visible for each scenario - Failing scenarios are visually prominent