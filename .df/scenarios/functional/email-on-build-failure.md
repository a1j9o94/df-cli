---
name: email-on-build-failure
type: functional
spec_id: run_01KK7SEADG3VVG04QBWK3E2MTP
created_by: agt_01KK7SEADH9C0FDQK9V2HRH78R
---

Setup: 1. Configure email via SMTP: 'dark notify setup --email pm@company.com --smtp-host smtp.example.com --smtp-port 587 --smtp-user user --smtp-pass pass'. 2. Verify config in .df/config.yaml has notifications.channels entry with type:email, provider:smtp. 3. Run a build that fails. Expected: An email is sent with: (a) Subject line '[dark] Build failed: <spec-title>', (b) HTML body containing error summary (first 200 chars of error), (c) scenario results showing pass/fail counts, (d) cost and duration, (e) module summary showing which modules failed. Pass criteria: Email sent via SMTP with correct subject format and HTML body containing all required fields.