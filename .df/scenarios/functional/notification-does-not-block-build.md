---
name: notification-does-not-block-build
type: functional
spec_id: run_01KJSS4TBB5ETC6ZA8FN3184DH
created_by: agt_01KJSS4TBDCV42SMK3D52DBTPF
---

## Notification Does Not Block Build

### Preconditions
- Project initialized with `dark init`
- Slack configured with a webhook URL that will return HTTP 500 errors

### Steps
1. Configure Slack with a broken webhook: `dark notify setup --slack https://httpbin.org/status/500`
2. Start a build that would complete successfully
3. Verify the build completes with status 'completed' despite the Slack notification failing
4. Verify a warning is logged about the notification failure (check stderr or log output)
5. Verify the notification system attempted a retry (1 retry after 5 seconds)
6. Verify the build duration was NOT significantly delayed by notification retries (async dispatch)
7. Verify no exception was thrown to the pipeline — the notify function caught all errors internally

### Expected Output
- Build completes successfully (exit code 0, status completed)
- Warning logged about failed notification
- Retry attempted once after 5s
- Build pipeline was not blocked

### Pass/Fail Criteria
- PASS: Build succeeds, notification failure is logged but does not affect build outcome
- FAIL: Build fails due to notification error, no warning logged, or build significantly delayed