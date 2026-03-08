---
name: import-with-labels
type: functional
spec_id: run_01KK713FAZE5AV73F5HB66BPVF
created_by: agt_01KK713FB00321PM7C8TQ1YDQZ
---

Test: Issue with labels 'bug' and 'p0' produces correct type and priority in frontmatter.

Setup:
- Mock exec returns issue JSON with labels: [{ name: 'bug' }, { name: 'p0' }]
- title: 'Login crashes on empty password'
- body: 'App crashes when password is empty.'
- Comments endpoint returns empty array

Steps:
1. Call importAndCreateSpec with the mocked registry
2. Verify result.type === 'bug'
3. Verify result.priority === 'critical'
4. Verify result.typeSource === 'bug'
5. Verify result.prioritySource === 'p0'
6. Read spec file content
7. Verify frontmatter contains 'type: bug'
8. Verify frontmatter contains 'priority: critical'

Pass criteria: type maps to 'bug' (from label 'bug'), priority maps to 'critical' (from label 'p0').