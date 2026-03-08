---
name: missing-gh-cli
type: functional
spec_id: run_01KK713FAZE5AV73F5HB66BPVF
created_by: agt_01KK713FB00321PM7C8TQ1YDQZ
---

Test: When gh CLI is not installed, a clear error with installation instructions is shown.

Setup:
- Create a GitHubImporter with a mock exec that throws 'command not found: gh' when 'gh --version' is called

Steps:
1. Create GitHubImporter with failing exec function
2. Call importer.fetch('https://github.com/org/repo/issues/1')
3. Verify it throws an error
4. Verify error message contains 'GitHub CLI (gh) required'
5. Verify error message contains 'https://cli.github.com'
6. Verify error message contains 'gh auth login'

Pass criteria: Error is thrown with all three required elements: the requirement message, the install URL, and the auth command.