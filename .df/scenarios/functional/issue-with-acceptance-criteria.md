---
name: issue-with-acceptance-criteria
type: functional
spec_id: run_01KK713FAZE5AV73F5HB66BPVF
created_by: agt_01KK713FB00321PM7C8TQ1YDQZ
---

Test: Issue body with Acceptance Criteria section produces scenarios in generated spec.

Setup:
- Mock issue body:
  'Feature description here.\n\n## Acceptance Criteria\n\n- [ ] User can log in with email\n- [ ] User can log in with SSO\n- [ ] Session persists across tabs'
- labels: [], comments: []

Steps:
1. Call importAndCreateSpec
2. Verify result.scenariosCount === 3
3. Read generated spec content
4. Verify '## Scenarios' section exists
5. Verify '### Functional' subsection contains 3 numbered scenarios
6. Verify each acceptance criteria item appears as a scenario entry
7. Verify Requirements section has placeholder (no checkboxes outside AC section)

Pass criteria: 3 acceptance criteria items become 3 functional scenarios. Requirements section shows placeholder text.