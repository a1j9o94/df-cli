---
name: swarm-completion-notification
type: functional
spec_id: run_01KK7SEADG3VVG04QBWK3E2MTP
created_by: agt_01KK7SEADH9C0FDQK9V2HRH78R
---

Setup: 1. Configure Slack webhook. 2. Run 'dark swarm' with 3 specs. Expected: (a) Individual spec completions do NOT trigger per-spec notifications, (b) a single 'swarm-completed' notification is sent when ALL 3 specs finish, (c) notification includes summary of all specs (titles, individual statuses), (d) if any spec fails, a 'swarm-failed' notification is sent instead identifying which spec failed. Pass criteria: Single aggregated notification for entire swarm, not per-spec.