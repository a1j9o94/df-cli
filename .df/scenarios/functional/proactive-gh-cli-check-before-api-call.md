---
name: proactive-gh-cli-check-before-api-call
type: functional
spec_id: run_01KJSS4TD4WH5VKGWK6YWSWJZQ
created_by: agt_01KJSY17XRYR0TZDX4VKPD6AB7
---

Setup: The gh CLI is not installed or not on PATH.\n\nSteps:\n1. Instantiate GitHubImporter\n2. Call fetch() with a valid GitHub issue URL\n3. Verify that BEFORE any gh api call is made, the importer checks gh --version\n4. Verify the error thrown is: 'GitHub CLI (gh) required. Install: https://cli.github.com and run gh auth login'\n5. Verify no gh api calls were attempted (the check should fail fast)\n\nPass criteria: The GitHubImporter.fetch() must proactively check 'gh --version' before calling 'gh api'. This ensures a clear, actionable error message rather than relying on OS-specific error messages from failed exec calls. The check must happen FIRST, not as a fallback catch.