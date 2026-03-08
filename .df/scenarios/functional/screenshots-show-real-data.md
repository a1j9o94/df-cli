---
name: screenshots-show-real-data
type: functional
spec_id: run_01KK7SEJF8M1ZV16NTKHPBWC4S
created_by: agt_01KK7SEJF9WN4SDJ2ZS9MSSD5X
---

Verify screenshots show real or realistic demo pipeline data, not placeholder content. Steps: 1) Open each PNG file in docs/screenshots/. 2) Verify dark-dash-active-run.png shows a dashboard with a phase bar, module grid, and agent timeline with actual module names and statuses. 3) Verify dark-dash-completed-run.png shows evaluation results and a cost summary with numeric values. 4) Verify dark-dash-roadmap.png shows a spec dependency graph with mixed statuses (some completed, some in progress, some draft). 5) Verify dark-dash-failed-run.png shows an error diagnosis view with error messages. 6) Verify dark-build-terminal.png shows terminal output with '[dark]' guardrail messages. 7) Verify dark-status-terminal.png shows output of 'dark status' and/or 'dark agent list' commands. Pass criteria: All screenshots contain real-looking data with actual values, not lorem ipsum or placeholder text. Images are readable PNGs with reasonable resolution (at least 800px wide).