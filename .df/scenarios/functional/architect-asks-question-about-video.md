---
name: architect-asks-question-about-video
type: functional
spec_id: run_01KJT1F6B8P7286PNQFFEBC6YK
created_by: agt_01KJT1F6BAHQ9P8AXSQ37AZDAF
---

## Scenario: Architect asks question about video

### Preconditions
- Dark Factory project initialized
- A run exists with an architect agent
- llm-youtube is in PATH

### Steps
1. Get architect agent ID from a running pipeline
2. Run: dark research video <agent-id> https://www.youtube.com/watch?v=dQw4w9WgXcQ --question 'What is this video about?'
3. Verify exit code is 0
4. Run: dark research list --run-id <run-id>
5. Verify a research artifact was created
6. Run: dark research show <artifact-id>
7. Verify the content contains an answer (not just raw transcript)
8. Verify the content references the question asked
9. Verify the label indicates this is a Q&A result, not just a transcript

### Expected Output
- Research artifact of type 'text'
- Content includes the question and the LLM-generated answer
- Content references the source video URL
- Stored in .df/research/<run-id>/

### Pass/Fail Criteria
- PASS: Q&A answer saved as research artifact, answer is contextual (not empty/generic)
- FAIL: Command errors, only raw transcript saved without answer, or --question flag ignored