---
name: unstructured-issue-body
type: functional
spec_id: run_01KK713FAZE5AV73F5HB66BPVF
created_by: agt_01KK713FB00321PM7C8TQ1YDQZ
---

Test: Issue with plain text body (no sections/checkboxes/headers) uses entire body as Goal with placeholder Requirements/Scenarios.

Setup:
- Mock issue with body: 'The application sometimes hangs when processing large files. Users have reported this happening with files over 100MB.'
- labels: [], comments: []

Steps:
1. Call importAndCreateSpec
2. Verify result.requirementsCount === 0
3. Verify result.scenariosCount === 0
4. Read generated spec content
5. Verify '## Goal' section contains the entire body text
6. Verify '## Requirements' section contains 'TODO' placeholder text
7. Verify '## Scenarios' > '### Functional' contains 'TODO' placeholder text

Pass criteria: Entire unstructured body becomes the Goal. Requirements and Scenarios sections have placeholder/TODO entries.