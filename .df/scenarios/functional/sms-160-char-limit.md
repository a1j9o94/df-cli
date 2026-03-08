---
name: sms-160-char-limit
type: functional
spec_id: run_01KK7SEADG3VVG04QBWK3E2MTP
created_by: agt_01KK7SEADH9C0FDQK9V2HRH78R
---

Setup: 1. Configure SMS: 'dark notify setup --sms +15551234567 --twilio-sid ACXXX --twilio-token xxx --twilio-from +15559876543'. 2. Complete a build with a long spec title. Expected: SMS message is 160 characters or fewer, formatted as '[dark] <spec-title>: <status>. Cost: $X.XX. <pass-rate>.' with spec title truncated if necessary to fit within 160 chars. Pass criteria: Twilio API receives a message body that is at most 160 characters.