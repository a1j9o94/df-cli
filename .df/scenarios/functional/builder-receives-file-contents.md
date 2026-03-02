---
name: builder-receives-file-contents
type: functional
spec_id: run_01KJP8WZ5DKH52F4S0SWCGKJWW
created_by: agt_01KJP8WZ5FJ90GR22QSDS2FYR3
---

## Scenario: Builder receives file contents in instructions

### Preconditions
- A spec exists that requires modifying an existing file (e.g., src/pipeline/engine.ts)
- An architect buildplan exists with a module that has scope.modifies: ["src/pipeline/engine.ts"]
- engine.ts is >200 lines (currently 1136 lines)

### Test Steps
1. Trigger the build phase for the module that modifies engine.ts
2. Intercept or read the mail message sent to the builder agent (query the messages table for the builder's agent ID)
3. Inspect the mail body content

### Expected Output
- The builder mail body contains a section with file contents (e.g., '## File Contents' or '## Pre-loaded Files')
- The section includes content from src/pipeline/engine.ts
- Since engine.ts is >200 lines, the included content should be an excerpt (relevant section), NOT the entire 1136-line file
- The excerpt should include enough surrounding context for the builder to understand where to make edits

### Pass/Fail Criteria
- PASS: Builder mail body contains file content from the modifies array AND respects the >200 line excerpt rule
- FAIL: Builder mail body has no file content, OR includes the full 1136-line file without excerpting