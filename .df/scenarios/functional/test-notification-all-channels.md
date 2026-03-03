---
name: test-notification-all-channels
type: functional
spec_id: run_01KJSS4TBB5ETC6ZA8FN3184DH
created_by: agt_01KJSS4TBDCV42SMK3D52DBTPF
---

## Test Notification to All Channels

### Preconditions
- Project initialized with `dark init`
- Slack configured: `dark notify setup --slack https://hooks.slack.com/services/T00/B00/xxx`
- Email configured: `dark notify setup --email pm@company.com --sendgrid-key SG.xxx`

### Steps
1. Run `dark notify test`
2. Verify the command outputs confirmation that test notifications are being sent
3. Verify Slack receives a test message with sample data:
   - Contains text indicating this is a test notification
   - Has sample spec title, cost, duration, module summary, scenario pass rate
   - Uses Block Kit formatting with green success color
4. Verify email receives a test message:
   - Subject matches pattern: `[dark] Build completed: Test Notification` (or similar)
   - HTML body contains same sample data as Slack
5. Verify command exits with success code 0
6. Verify test notification content clearly indicates it is a TEST (not a real build event)

### Expected Output
- Both Slack and email receive test notifications
- Test data is realistic but clearly marked as test
- Command exits successfully

### Pass/Fail Criteria
- PASS: All configured channels receive test notification with sample data, exit code 0
- FAIL: Any channel does not receive notification, missing sample data, or non-zero exit code