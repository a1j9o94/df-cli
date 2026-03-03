---
name: architect-extracts-video-transcript
type: functional
spec_id: run_01KJT1F6B8P7286PNQFFEBC6YK
created_by: agt_01KJT1F6BAHQ9P8AXSQ37AZDAF
---

## Scenario: Architect extracts video transcript

### Preconditions
- Dark Factory project initialized (dark init)
- A run exists with an architect agent
- llm-youtube is in PATH and functional

### Steps
1. Create a test spec that references a YouTube URL (e.g., https://www.youtube.com/watch?v=dQw4w9WgXcQ)
2. Start a run, get the architect agent ID
3. Run: dark research video <agent-id> https://www.youtube.com/watch?v=dQw4w9WgXcQ
4. Verify exit code is 0
5. Run: dark research list --run-id <run-id>
6. Verify the transcript appears as a research artifact with type 'text'
7. Run: dark research show <artifact-id>
8. Verify the content contains transcript text (not empty, not an error message)
9. Verify the artifact label contains the video URL or video title for traceability

### Expected Output
- Research artifact created in .df/research/<run-id>/ directory
- Artifact is of type 'text'
- Content is non-empty markdown containing transcript text
- Artifact is queryable via dark research list and dark research show

### Pass/Fail Criteria
- PASS: Transcript saved as research artifact, retrievable by run-id
- FAIL: Command errors, no artifact created, or artifact content is empty/error