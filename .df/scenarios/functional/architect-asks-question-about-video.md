---
name: architect-asks-question-about-video
type: functional
spec_id: run_01KK7SEAMQH4864S3Q22NACE6H
created_by: agt_01KK7SEAMS9TJ2REHZD0ZZYG49
---

## Scenario: Architect asks question about video

### Preconditions
- A Dark Factory project is initialized
- An architect agent exists with a valid run_id
- llm-youtube CLI is available in PATH

### Steps
1. Create an architect agent for a run
2. Run: dark research video <agent-id> https://www.youtube.com/watch?v=dQw4w9WgXcQ --question "What library does this tutorial use for auth?"
3. Verify command exits with code 0
4. Run: dark research list --run-id <run-id>
5. Verify the Q&A artifact appears with:
   - Label starting with "Video Q&A:"
   - Type: "text"
6. Run: dark research show <artifact-id>
7. Verify content contains:
   - "# Video Q&A" header
   - "**Source:** <url>"
   - "## Question" section with the original question
   - "## Answer" section with the LLM answer

### Pass/Fail Criteria
- PASS: Q&A artifact is created with question and answer properly formatted, label uses "Video Q&A" prefix
- FAIL: Command errors, missing question or answer sections, wrong label prefix