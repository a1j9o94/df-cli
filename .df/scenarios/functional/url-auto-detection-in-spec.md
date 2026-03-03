---
name: url-auto-detection-in-spec
type: functional
spec_id: run_01KJT1F6B8P7286PNQFFEBC6YK
created_by: agt_01KJT1F6BAHQ9P8AXSQ37AZDAF
---

## Scenario: URL auto-detection in spec

### Preconditions
- Dark Factory project initialized
- A spec exists with YouTube/Loom URLs embedded in its body

### Steps
1. Create a spec with this content: 'See the tutorial at https://www.youtube.com/watch?v=abc123 for implementation details. Also review the walkthrough at https://www.loom.com/share/xyz789.'
2. Start a build run for this spec
3. Check the architect agent's mail: dark mail check --agent <architect-id>
4. Verify the mail body contains a section calling out the detected URLs
5. Verify the mail mentions both the YouTube URL and the Loom URL
6. Verify the mail suggests using 'dark research video' to extract context from each URL
7. Create a spec with NO video URLs in its body
8. Start a build run for this spec
9. Check the architect's mail
10. Verify there is NO video URL section (don't show empty sections)

### Expected Output
- When spec contains YouTube/Loom URLs: architect mail includes a 'Video References' section listing them
- The section suggests: 'The spec references these videos — use dark research video to extract context before decomposing'
- When spec has no video URLs: no video section appears in the mail

### URL Detection Patterns (must match)
- https://www.youtube.com/watch?v=abc123
- https://youtube.com/watch?v=abc123
- https://youtu.be/abc123
- https://www.loom.com/share/abc123
- http://loom.com/share/abc123

### Pass/Fail Criteria
- PASS: URLs detected in spec, called out in architect mail with dark research video suggestion
- FAIL: URLs not detected, or no suggestion to use dark research video, or empty section shown for specs without URLs