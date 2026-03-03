---
name: issue-with-acceptance-criteria
type: functional
spec_id: run_01KJSS4TD4WH5VKGWK6YWSWJZQ
created_by: agt_01KJSS4TD5H3A6M3NHC0H95JFZ
---

Setup: GitHub issue with body containing an '## Acceptance Criteria' section with 3 checkboxes:\n'## Acceptance Criteria\n- [ ] User sees error message within 2 seconds\n- [ ] Error includes retry link\n- [ ] Failed attempts are logged with stack trace'\n\nSteps:\n1. Run: dark spec create --from-github https://github.com/org/repo/issues/789\n2. Read the generated spec file\n3. Verify the spec has a '## Scenarios' section with a '### Functional' subsection\n4. Verify the Functional subsection contains 3 scenario entries derived from the acceptance criteria:\n   - 'User sees error message within 2 seconds'\n   - 'Error includes retry link'\n   - 'Failed attempts are logged with stack trace'\n5. Verify stdout includes 'Scenarios: 3 extracted from acceptance criteria'\n\nAlso test: If the issue body has a '## Test Cases' section instead of '## Acceptance Criteria', the same extraction should apply — test cases become scenarios.\n\nPass criteria: Acceptance criteria checkboxes (or Test Cases) are extracted into Scenarios > Functional section. Count is accurate in summary output.