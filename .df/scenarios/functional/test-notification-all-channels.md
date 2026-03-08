---
name: test-notification-all-channels
type: functional
spec_id: run_01KK7SEADG3VVG04QBWK3E2MTP
created_by: agt_01KK7SEADH9C0FDQK9V2HRH78R
---

Setup: 1. Configure both Slack and email channels: 'dark notify setup --slack <url>' and 'dark notify setup --email pm@co.com --sendgrid-key SG.xxx'. 2. Run 'dark notify test'. Expected: (a) Both Slack and email channels receive a test notification, (b) test message contains sample/mock data (sample spec title, sample cost, sample duration, sample module summary, sample scenario results), (c) output confirms which channels were tested and whether they succeeded or failed, (d) test uses the same formatting as real notifications (Block Kit for Slack, HTML for email). Pass criteria: Both channels receive properly formatted test messages with sample data.