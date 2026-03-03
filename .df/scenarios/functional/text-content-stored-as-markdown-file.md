---
name: text-content-stored-as-markdown-file
type: functional
spec_id: run_01KJSS7KKA4VATPRQN2J08E2ZX
created_by: agt_01KJSWV40N90SGAYG09R1AJJSQ
---

## Scenario: Text content stored as markdown file on filesystem

### Preconditions
- Dark Factory project initialized
- A run and agent exist

### Steps
1. Run: dark research add <agent-id> --label 'Some notes' --content 'Important finding about the API'
2. Verify command exits with code 0
3. Verify a .md file exists in .df/research/<run-id>/ containing the text content
4. Verify the .md file content matches the provided --content value
5. Verify the DB record file_path points to the .md file

### Rationale
The spec Module 2 says 'Text content stored as markdown files' in .df/research/<run-id>/. The current implementation stores text content ONLY in the database (content column) without creating a corresponding .md file on the filesystem. This gap means text content is not stored in both DB and filesystem — only in DB.

### Pass/Fail Criteria
- PASS: Text content is persisted as a .md file in .df/research/<run-id>/ AND in the database.
- FAIL: Text content is only in the database without a corresponding .md file.