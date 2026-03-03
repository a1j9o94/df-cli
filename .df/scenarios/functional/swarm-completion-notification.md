---
name: swarm-completion-notification
type: functional
spec_id: run_01KJSS4TBB5ETC6ZA8FN3184DH
created_by: agt_01KJSS4TBDCV42SMK3D52DBTPF
---

## Swarm Completion Notification

### Preconditions
- Project initialized with `dark init`
- Slack configured: `dark notify setup --slack https://hooks.slack.com/services/T00/B00/xxx`

### Steps
1. Run `dark swarm` with 3 specs
2. Verify that individual spec completions do NOT trigger notifications
3. Verify that when ALL 3 specs complete, a single `swarm-completed` notification is sent
4. Verify the Slack notification contains:
   - Event type indicates swarm completion (not individual build)
   - Summary of all specs in the swarm
   - Overall status (completed/failed)
   - Total cost across all specs
   - Total duration
5. If any spec in the swarm fails and blocks downstream, verify a `swarm-failed` notification is sent instead with error severity (red)

### Expected Output
- Single notification when entire swarm completes
- No per-spec notifications during swarm execution
- Notification contains aggregate swarm data

### Pass/Fail Criteria
- PASS: Single swarm-completed notification sent after all specs finish, contains aggregate data, no per-spec notifications
- FAIL: Per-spec notifications during swarm, no swarm completion notification, or missing aggregate data