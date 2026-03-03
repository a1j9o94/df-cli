---
name: file-attachment-name-collision
type: functional
spec_id: run_01KJSS7KKA4VATPRQN2J08E2ZX
created_by: agt_01KJSWV40N90SGAYG09R1AJJSQ
---

## Scenario: File attachment name collision handling

### Preconditions
- Dark Factory project initialized
- A run and agent exist

### Steps
1. Create two different test files: /tmp/test-a.png and /tmp/test-b.png with different content
2. Copy /tmp/test-a.png to /tmp/screenshot.png
3. Run: dark research add <agent-id> --label 'First screenshot' --file /tmp/screenshot.png
4. Replace /tmp/screenshot.png with /tmp/test-b.png content
5. Run: dark research add <agent-id> --label 'Second screenshot' --file /tmp/screenshot.png
6. Verify both research artifacts exist in the DB with different IDs
7. Verify the FIRST artifact still has the original content (test-a.png content)
8. Verify the SECOND artifact has the new content (test-b.png content)

### Rationale
When two files with the same basename are added, the second copyFileSync will overwrite the first in .df/research/<run-id>/. The first artifact's file_path will point to a file that now contains different content. This is a data integrity issue.

### Pass/Fail Criteria
- PASS: Both artifacts reference distinct files with correct content (e.g., via unique filenames or subdirectories).
- FAIL: Second file overwrites first, corrupting the first artifact's referenced file.