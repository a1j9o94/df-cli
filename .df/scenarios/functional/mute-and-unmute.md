---
name: mute-and-unmute
type: functional
spec_id: run_01KJSS4TBB5ETC6ZA8FN3184DH
created_by: agt_01KJSS4TBDCV42SMK3D52DBTPF
---

## Mute and Unmute Notifications

### Preconditions
- Project initialized with `dark init`
- Slack configured: `dark notify setup --slack https://hooks.slack.com/services/T00/B00/xxx`
- Notifications are enabled (default state)

### Steps
1. Verify `dark notify status` shows `enabled: true`
2. Run `dark notify mute`
3. Verify `dark notify status` shows `enabled: false`
4. Verify `.df/config.yaml` has `notifications.enabled: false`
5. Complete a build successfully
6. Verify NO Slack notification was sent (muted)
7. Run `dark notify unmute`
8. Verify `dark notify status` shows `enabled: true`
9. Verify `.df/config.yaml` has `notifications.enabled: true`
10. Complete another build successfully
11. Verify Slack notification WAS sent (unmuted)

### Expected Output
- Mute sets enabled to false in config
- No notifications sent while muted
- Unmute sets enabled to true in config
- Notifications resume after unmute

### Pass/Fail Criteria
- PASS: Mute silences notifications, unmute restores them, config file reflects state changes
- FAIL: Notifications sent while muted, config not updated, or notifications not restored after unmute