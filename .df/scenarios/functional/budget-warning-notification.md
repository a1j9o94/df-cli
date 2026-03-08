---
name: budget-warning-notification
type: functional
spec_id: run_01KK7SEADG3VVG04QBWK3E2MTP
created_by: agt_01KK7SEADH9C0FDQK9V2HRH78R
---

Setup: 1. Configure Slack webhook. 2. Start a build with --budget-usd 10. 3. Build costs accumulate past $8 (80% threshold). Expected: (a) A 'budget-warning' notification is sent when cost crosses 80% of budget (~$8), (b) notification contains current cost, budget limit, and percentage used, (c) Slack message uses yellow color-coded attachment (warning severity), (d) the build continues running (not paused/stopped at 80%), (e) if cost reaches 100%, a separate 'budget-exceeded' notification is sent with red/error severity. Pass criteria: Warning notification sent at 80% mark, build continues, separate notification at 100%.