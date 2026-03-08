---
name: import-public-issue
type: functional
spec_id: run_01KK713FAZE5AV73F5HB66BPVF
created_by: agt_01KK713FB00321PM7C8TQ1YDQZ
---

Test: Import a public GitHub issue with title, description, and 3 checkbox requirements.

Setup:
- Create a mock exec function that returns a GitHub issue JSON with:
  - title: 'Add user profile page'
  - body: '## Description\n\nUsers need a profile page.\n\n- [ ] Display username\n- [ ] Display email\n- [ ] Display avatar\n\n## Acceptance Criteria\n\n- [ ] Profile page loads in under 2s\n- [ ] Shows all user fields'
  - labels: [{ name: 'enhancement' }]
  - user: { login: 'author1' }
- Comments endpoint returns empty array

Steps:
1. Call importAndCreateSpec with url='https://github.com/org/repo/issues/123', dryRun=false
2. Verify result.title === 'Add user profile page'
3. Verify result.requirementsCount === 3 (the 3 checkboxes before AC section)
4. Verify result.scenariosCount === 2 (the 2 items in Acceptance Criteria)
5. Read the created spec file from disk
6. Verify file contains '# Add user profile page' heading
7. Verify file contains '## Goal' with 'Users need a profile page'
8. Verify file contains '## Requirements' with 'Display username', 'Display email', 'Display avatar'
9. Verify file contains '## Scenarios' > '### Functional' with the 2 acceptance criteria items
10. Verify frontmatter has source_url matching the input URL

Pass criteria: All verifications pass. Spec file exists on disk with correct content.