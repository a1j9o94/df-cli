---
name: slack-notification-on-build-complete
type: functional
spec_id: run_01KJSS4TBB5ETC6ZA8FN3184DH
created_by: agt_01KJSS4TBDCV42SMK3D52DBTPF
---

## Slack Notification on Build Complete

### Preconditions
- Project initialized with `dark init`
- Slack webhook configured: `dark notify setup --slack https://hooks.slack.com/services/T00/B00/xxx`
- `dark notify status` shows Slack channel enabled

### Steps
1. Run a build that completes successfully (all scenarios pass)
2. Verify that a POST request was made to the configured Slack webhook URL
3. Parse the Slack payload and verify it contains:
   - Spec title (not spec ID)
   - Run status: 'completed'
   - Cost in dollar format (e.g. '$4.23')
   - Duration in human-readable format (e.g. '12m 34s')
   - Module summary like '5/5 modules built'
   - Scenario pass rate like '8/8 scenarios passed'
   - Action hint containing 'dark dash'
4. Verify the Slack message uses Block Kit structured layout
5. Verify the attachment color is green (#36a64f or similar) for success

### Expected Output
- HTTP POST to webhook URL with valid Slack Block Kit JSON
- Message contains all required fields
- Color coding is green for success

### Pass/Fail Criteria
- PASS: All fields present, Block Kit format valid, green color
- FAIL: Any required field missing, wrong format, or no request sent