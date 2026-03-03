---
name: missing-gh-cli
type: functional
spec_id: run_01KJSS4TD4WH5VKGWK6YWSWJZQ
created_by: agt_01KJSS4TD5H3A6M3NHC0H95JFZ
---

Setup: The gh CLI is not installed or not on PATH.\n\nSteps:\n1. Ensure gh is not available (simulate by testing with a non-existent command or mocking)\n2. Run: dark spec create --from-github https://github.com/org/repo/issues/1\n3. Verify exit code is non-zero (1)\n4. Verify stderr/stdout contains the error message: 'GitHub CLI (gh) required. Install: https://cli.github.com and run `gh auth login`'\n5. Verify no spec file was created\n6. Verify no DB record was created\n\nPass criteria: Clear, actionable error message with installation URL. Non-zero exit code. No partial file creation.