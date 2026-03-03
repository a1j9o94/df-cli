---
name: architect-saves-screenshot-file
type: functional
spec_id: run_01KJSS7KKA4VATPRQN2J08E2ZX
created_by: agt_01KJSS7KKB53MFBSPK7CK20AE0
---

## Scenario: Architect saves a screenshot file

### Preconditions
- Dark Factory project initialized (dark init)
- A run exists with a known run_id
- An architect agent exists with a known agent_id
- A test file exists at /tmp/test-screenshot.png (create a small valid PNG for the test)

### Setup
1. Create a test PNG file: echo -n 'iVBORw0KGgo=' | base64 -d > /tmp/test-screenshot.png (or any small PNG)

### Steps
1. Run: dark research add <agent-id> --label 'Reference checkout flow' --file /tmp/test-screenshot.png
2. Verify command exits with code 0
3. Verify the file was COPIED (not moved) to .df/research/<run-id>/ directory
4. Verify the copied file in .df/research/<run-id>/ has the same content as /tmp/test-screenshot.png
5. Run: dark research list --run-id <run-id>
6. Verify the output includes 'Reference checkout flow' label and shows type 'file'
7. Run: dark research show <research-id>
8. Verify it shows the file_path pointing to the copied file in .df/research/<run-id>/
9. Verify the research_artifacts DB row has: type='file', file_path pointing to .df/research/<run-id>/*, label='Reference checkout flow'

### Pass/Fail Criteria
- PASS: File copied to .df/research/<run-id>/, DB record created with correct type and file_path, original file still exists at /tmp/test-screenshot.png.
- FAIL: File not copied, DB record missing or incorrect, or original file was moved instead of copied.