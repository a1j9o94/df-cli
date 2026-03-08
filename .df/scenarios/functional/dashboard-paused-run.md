---
name: dashboard-paused-run
type: functional
spec_id: run_01KK6J195CBPQR35EVQ13YJ2J1
created_by: agt_01KK6J195DC0DXB8P1GAVSK9J8
---

SETUP: A run in 'paused' state with cost_usd=14.87, budget_usd=15.00, pause_reason='budget_exceeded'. STEPS: 1. Start dashboard with 'dark dash'. 2. View the run list/detail. EXPECTED: (a) Paused run shows a yellow/amber status badge with text 'Paused'. (b) Reason displayed below badge: 'Budget limit reached ($14.87 / $15.00)'. (c) An 'Add Budget' button/action is visible. (d) The 'Add Budget' action pre-fills a 'dark continue <run-id>' command or shows a form. (e) Paused runs are NOT grouped with failed runs — they appear as a separate category. (f) Run timeline shows the pause event as a milestone marker. PASS CRITERIA: Paused run visually distinct from failed, shows budget info and resume action.