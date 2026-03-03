---
name: email-on-build-failure
type: functional
spec_id: run_01KJSS4TBB5ETC6ZA8FN3184DH
created_by: agt_01KJSS4TBDCV42SMK3D52DBTPF
---

## Email on Build Failure

### Preconditions
- Project initialized with `dark init`
- Email configured via SMTP: `dark notify setup --email pm@company.com --smtp-host smtp.example.com --smtp-port 587 --smtp-user user --smtp-pass pass`
- `dark notify status` shows email channel enabled

### Steps
1. Run a build that fails (agent crash, scenario failure, or pipeline error)
2. Verify an email is sent to the configured address (pm@company.com)
3. Verify email subject matches pattern: `[dark] Build failed: <spec-title>`
4. Parse the HTML email body and verify it contains:
   - Spec title (not spec ID)
   - Run status: 'failed'
   - Cost in dollar format
   - Duration in human-readable format
   - Module summary (e.g. '3/5 modules built, 2 failed')
   - Scenario pass rate (e.g. '6/8 passed, 2 failed')
   - Error summary: first 200 chars of the error message
   - Action hint with 'dark dash' or dashboard URL
5. Verify the email body is valid HTML (not plain text)

### Expected Output
- Email sent to pm@company.com
- Subject contains 'failed' and spec title
- HTML body contains all required notification fields
- Error summary is present and truncated to 200 chars max

### Pass/Fail Criteria
- PASS: Email sent with correct subject pattern, HTML body with all fields, error summary present
- FAIL: No email sent, missing fields, wrong subject format, or plain text instead of HTML