---
name: mute-unmute-notifications
type: functional
spec_id: run_01KK7SEADG3VVG04QBWK3E2MTP
created_by: agt_01KK7SEADH9C0FDQK9V2HRH78R
---

Setup: 1. Configure Slack webhook. 2. Run 'dark notify mute'. 3. Verify .df/config.yaml has notifications.enabled = false. 4. Complete a build successfully. Expected: No Slack notification is sent during muted period. 5. Run 'dark notify unmute'. 6. Verify .df/config.yaml has notifications.enabled = true. 7. Complete another build successfully. Expected: Slack notification IS sent after unmuting. 8. Run 'dark notify status'. Expected: Output shows enabled state and lists configured channels. Pass criteria: No notification while muted, notification resumes after unmute, status command accurately reports state.