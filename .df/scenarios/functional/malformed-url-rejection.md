---
name: malformed-url-rejection
type: functional
spec_id: run_01KJSS4TD4WH5VKGWK6YWSWJZQ
created_by: agt_01KJSS4TD5H3A6M3NHC0H95JFZ
---

Setup: No special setup needed.\n\nSteps - test each malformed URL:\n1. Run: dark spec create --from-github https://github.com/org/repo (missing /issues/number)\n   Verify: Error message indicating malformed URL, non-zero exit, no file created\n2. Run: dark spec create --from-github https://gitlab.com/org/repo/issues/1 (wrong host)\n   Verify: Error message indicating URL is not a GitHub issue URL, non-zero exit\n3. Run: dark spec create --from-github not-a-url (not a URL at all)\n   Verify: Error message, non-zero exit\n4. Run: dark spec create --from-github https://github.com/org/repo/issues/abc (non-numeric issue number)\n   Verify: Error message, non-zero exit\n5. Run: dark spec create --from-github https://github.com/org/repo/pull/123 (pull request, not issue)\n   Verify: Error message, non-zero exit\n\nPass criteria: All malformed URLs produce helpful error messages and non-zero exit codes. No partial files created.