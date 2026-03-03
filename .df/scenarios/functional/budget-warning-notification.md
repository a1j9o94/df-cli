---
name: budget-warning-notification
type: functional
spec_id: run_01KJSS4TBB5ETC6ZA8FN3184DH
created_by: agt_01KJSS4TBDCV42SMK3D52DBTPF
---

## Budget Warning Notification

### Preconditions
- Project initialized with `dark init`
- Slack webhook configured: `dark notify setup --slack https://hooks.slack.com/services/T00/B00/xxx`
- Build budget set to $10 (`--budget-usd 10`)

### Steps
1. Start a build with `--budget-usd 10` and Slack notifications configured
2. Simulate or wait for run cost to reach ~$8 (80% of $10 budget)
3. Verify a `budget-warning` notification is sent via Slack when cost crosses 80% threshold
4. Verify the notification:
   - Has warning severity (yellow color in Slack)
   - Contains the spec title
   - Shows current cost and budget ('$8.00 of $10.00 budget')
   - Contains a warning message about approaching budget limit
5. Verify the build CONTINUES running after the warning (not stopped)
6. If cost exceeds 100%, verify a separate `budget-exceeded` notification is sent with error severity (red)

### Expected Output
- Warning notification at 80% budget threshold
- Yellow/warning color coding in Slack
- Build continues running after warning
- Separate error notification at 100% if budget exceeded

### Pass/Fail Criteria
- PASS: Warning sent at ~80%, build continues, correct severity/color
- FAIL: No warning at 80%, build stopped at 80%, wrong severity, or warning sent at wrong threshold