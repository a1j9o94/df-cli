---
name: slack-notification-on-build-complete
type: functional
spec_id: run_01KK7SEADG3VVG04QBWK3E2MTP
created_by: agt_01KK7SEADH9C0FDQK9V2HRH78R
---

Setup: 1. Configure Slack webhook via 'dark notify setup --slack https://hooks.slack.com/services/TEST'. 2. Verify config stored in .df/config.yaml under notifications.channels with type:slack. 3. Run a build that completes successfully. Expected: A Slack message is sent to the webhook URL containing: (a) spec title (not ID), (b) run status 'completed', (c) cost formatted as dollar amount e.g. '$4.23', (d) duration in human-readable format e.g. '12m 34s', (e) module summary e.g. '5/5 modules built', (f) scenario pass rate e.g. '8/8 scenarios passed', (g) action hint 'View: dark dash'. Slack message must use Block Kit format with green color-coded attachment. Pass criteria: Webhook receives POST with valid Slack Block Kit JSON containing all required fields.