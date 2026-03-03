---
name: builder-reads-video-research
type: functional
spec_id: run_01KJT1F6B8P7286PNQFFEBC6YK
created_by: agt_01KJT1F6BAHQ9P8AXSQ37AZDAF
---

## Scenario: Builder reads video research

### Preconditions
- Dark Factory project initialized
- Architect has already extracted video research tagged to a specific module
- A builder agent exists for that module

### Steps
1. As architect, run: dark research video <arch-agent-id> <url> --module my-module
2. Verify artifact created with module_id = 'my-module'
3. As builder, run: dark research list --run-id <run-id> --module my-module
4. Verify the video research artifact appears in the list
5. Run: dark research show <artifact-id>
6. Verify the full transcript/answer content is accessible
7. Run: dark research list --run-id <run-id> --module other-module
8. Verify the video research does NOT appear when filtering by a different module

### Expected Output
- Video research is accessible via dark research list filtered by module
- Content is fully readable by builder via dark research show
- Module filtering works correctly — only shows tagged research

### Pass/Fail Criteria
- PASS: Builder can see video research for their module, filtering works
- FAIL: Research not visible, module tag not persisted, or filtering broken