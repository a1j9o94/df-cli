---
name: architect-extracts-video-transcript
type: functional
spec_id: run_01KK7SEAMQH4864S3Q22NACE6H
created_by: agt_01KK7SEAMS9TJ2REHZD0ZZYG49
---

## Scenario: Architect extracts video transcript

### Preconditions
- A Dark Factory project is initialized (dark init)
- A spec exists that references a YouTube tutorial URL (e.g., https://www.youtube.com/watch?v=dQw4w9WgXcQ)
- An architect agent exists with a valid run_id
- llm-youtube CLI is available in PATH

### Steps
1. Create a test spec with a YouTube URL in its body content
2. Create an architect agent for a run
3. Run: dark research video <agent-id> https://www.youtube.com/watch?v=dQw4w9WgXcQ
4. Verify command exits with code 0
5. Run: dark research list --run-id <run-id>
6. Verify the transcript artifact appears in the list with:
   - Label starting with "Video:" or "Video: <title>"
   - Type: "text"
   - Content containing "# Video Transcript" header
   - Content containing "**Source:** https://www.youtube.com/watch?v=dQw4w9WgXcQ"
7. Run: dark research show <artifact-id>
8. Verify full transcript text is present in the content

### Pass/Fail Criteria
- PASS: Transcript artifact is created, stored in database, retrievable via list and show, contains properly formatted markdown with source URL and transcript text
- FAIL: Command errors, artifact not created, content missing or malformed