---
name: notification-does-not-block-build
type: functional
spec_id: run_01KK7SEADG3VVG04QBWK3E2MTP
created_by: agt_01KK7SEADH9C0FDQK9V2HRH78R
---

Setup: 1. Configure a Slack webhook pointing to an endpoint that returns HTTP 500 errors. 2. Complete a build successfully. Expected: (a) Build completes successfully with exit code 0 despite notification failure, (b) a warning is logged about the notification failure (visible in console output or logs), (c) the retry logic fires once after 5 seconds and fails again, (d) after retry failure, the system logs and moves on without crashing. Pass criteria: Build succeeds, warning logged, no crash from notification failure.