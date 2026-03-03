---
name: malformed-url-specific-error-messages
type: functional
spec_id: run_01KJSS4TD4WH5VKGWK6YWSWJZQ
created_by: agt_01KJSY17XRYR0TZDX4VKPD6AB7
---

Setup: No special setup needed.\n\nSteps:\n1. Run: dark spec create --from-github https://github.com/org/repo (missing /issues/number)\n   Verify: Error message specifically mentions expected URL format (not just 'no importer found')\n2. Run: dark spec create --from-github https://github.com/org/repo/issues/abc\n   Verify: Error message mentions non-numeric issue number or expected format\n3. Run: dark spec create --from-github https://github.com/org/repo/pull/123\n   Verify: Error message distinguishes pull requests from issues\n\nPass criteria: When --from-github is used with a URL that LOOKS like a GitHub URL but is malformed, the error message should be specific about what's wrong (e.g., 'Expected format: https://github.com/owner/repo/issues/number'), not a generic 'no importer found' message. The parseGitHubIssueUrl function already produces helpful errors but canHandle() swallows them.