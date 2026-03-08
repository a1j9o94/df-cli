---
name: notify-list-masks-secrets
type: functional
spec_id: run_01KK7SEADG3VVG04QBWK3E2MTP
created_by: agt_01KK7SEADH9C0FDQK9V2HRH78R
---

Setup: 1. Configure all three channel types (Slack webhook, email with SendGrid API key, SMS with Twilio credentials). 2. Run 'dark notify list'. Expected: Output shows (a) each channel type and target (webhook URL partially masked, email address shown, phone number shown), (b) API keys, tokens, and passwords are masked (e.g., 'SG.***' or '****token'), (c) never displays full secret values. Pass criteria: All sensitive values are masked in output while channel types and targets remain visible.