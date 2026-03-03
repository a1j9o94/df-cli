---
name: evaluator-visual-comparison
type: functional
spec_id: run_01KJT1F6EV2A1H0TKH6N55D515
created_by: agt_01KJT1F6EWZQATERS37B1QJ6TS
---

## Scenario: Evaluator visual comparison workflow

### Preconditions
- A spec exists with an attached PNG mockup
- A build has completed (modules built, merged)
- The built application produces a visually comparable output (e.g., HTML page)

### Steps
1. Attach a mockup PNG to a spec
2. Complete a build that produces a simple HTML page
3. Verify the evaluator prompt/instructions include:
   a. Attachment paths pointing to the original mockup
   b. Instructions to compare visual output against the mockup
4. Verify dark eval screenshot command exists (even if stub):
   dark eval screenshot http://localhost:3000 --output screenshot.png
5. Verify the evaluator context (gatherEvaluatorContext) includes attachment information
6. Verify the VisualScore type is available: { layout: number, color: number, typography: number, overall: number }
7. Verify all scores are in range 0.0-1.0

### Expected Output
- Evaluator prompt contains visual comparison instructions when attachments are present
- dark eval screenshot command is registered (may be a stub that returns an error about no running app)
- VisualScore interface is exported and usable
- EvaluatorContext includes an attachments field with file paths

### Pass/Fail Criteria
- PASS: Evaluator has access to mockups, visual comparison scoring types exist, screenshot command is wired
- FAIL: Evaluator has no knowledge of attachments, screenshot command missing, or VisualScore type undefined