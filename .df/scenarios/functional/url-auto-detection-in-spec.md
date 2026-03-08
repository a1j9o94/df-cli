---
name: url-auto-detection-in-spec
type: functional
spec_id: run_01KK7SEAMQH4864S3Q22NACE6H
created_by: agt_01KK7SEAMS9TJ2REHZD0ZZYG49
---

## Scenario: URL auto-detection in spec content

### Preconditions
- A Dark Factory project is initialized
- A spec exists with YouTube URL(s) embedded in its body text

### Steps
1. Create a spec with body containing: "See this tutorial: https://www.youtube.com/watch?v=abc123 for implementation details"
2. Start a build run for this spec (triggers architect phase)
3. Inspect the architect's mail instructions (dark mail check --agent <architect-id>)
4. Verify the mail body contains:
   - A "Video References" section
   - The detected URL: https://www.youtube.com/watch?v=abc123
   - A suggested command: dark research video <agent-id> https://www.youtube.com/watch?v=abc123
5. Also verify the architect system prompt contains a "Referenced Videos" section with the URL

### Additional verification
6. Create a second spec with NO video URLs
7. Start a build run for the second spec
8. Verify the architect's mail instructions do NOT contain a "Video References" section

### URL formats to test
- https://www.youtube.com/watch?v=abc123 (standard YouTube)
- https://youtu.be/abc123 (short YouTube)
- https://www.loom.com/share/abc123def456 (Loom)

### Pass/Fail Criteria
- PASS: Video URLs are detected in spec content and surfaced in architect instructions with pre-formatted commands. No video section when spec has no URLs.
- FAIL: URLs not detected, section missing, commands not formatted, or section appears when no URLs present