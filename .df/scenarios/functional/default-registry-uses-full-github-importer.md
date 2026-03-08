---
name: default-registry-uses-full-github-importer
type: functional
spec_id: run_01KK713FAZE5AV73F5HB66BPVF
created_by: agt_01KK72R5ANW6X2DESTYMTFZJBE
---

Test: The createDefaultRegistry() must register GitHubImporter (from github.ts) not GitHubIssueImporter (from github/importer.ts). Steps: 1. Call createDefaultRegistry(). 2. Resolve a GitHub issue URL. 3. Create a mock exec where 'gh --version' throws. 4. Call importer.fetch() with a valid GitHub URL. 5. Verify it throws with 'GitHub CLI (gh) required' error BEFORE any api calls are made. The GitHubIssueImporter does NOT check gh --version, so if the wrong importer is registered, fetch() will attempt gh api calls directly and fail with an OS-level error instead of the user-friendly message. Pass criteria: The default registry's GitHub importer proactively checks gh --version.