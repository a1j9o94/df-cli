---
name: builder-receives-file-contents
type: functional
spec_id: run_01KJQ3RPWCVM02YZ86GB23AHTX
created_by: agt_01KJQ3RPWEX5P5Z3N2EG0ASHGW
---

## Scenario: Builder receives file contents in instructions

### Preconditions
- A spec exists that requires modifying an existing file (e.g., src/pipeline/engine.ts)
- The architect has created a buildplan with a module whose scope includes modifies: ["src/pipeline/engine.ts"]
- engine.ts exists and has 300+ lines of content

### Test Steps
1. Run the pipeline through the build phase for this module
2. Intercept or read the mail sent to the builder agent (dark mail check --agent <builder-agent-id>)
3. Examine the builder's instruction mail body

### Expected Results
- The mail body MUST contain the actual file contents (or a relevant excerpt) of src/pipeline/engine.ts
- For files >200 lines, the excerpt should include the relevant section based on the module's scope (function names or line ranges)
- The builder should NOT need to spend turns reading the file — it should already be in context
- The instruction should clearly indicate which parts of the file need modification

### Pass/Fail Criteria
- PASS: Builder mail contains file content or relevant excerpt from the file specified in scope.modifies
- FAIL: Builder mail only references the file name without including its contents