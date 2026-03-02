---
name: change-preload-strategy
type: change
spec_id: run_01KJQ3RPWCVM02YZ86GB23AHTX
created_by: agt_01KJQ3RPWEX5P5Z3N2EG0ASHGW
---

## Changeability Scenario: Switch pre-load strategy from full file to function-level excerpt

### Modification Description
Change the file pre-loading strategy from 'include the full file contents' to 'include only function-level excerpts relevant to the module scope.' For example, if a module needs to modify function parseConfig() in a 600-line file, only include parseConfig() and its immediate context (±20 lines) rather than the entire file.

### Affected Areas
- The content extraction logic in the instructions system (src/pipeline/instructions.ts) — specifically the function that reads file contents and prepares the excerpt for builder mail
- This is the ONLY file/function that should need to change
- The mail delivery system (mail/send.ts) should NOT need changes
- The builder prompt format (src/agents/prompts/builder.ts) should NOT need changes
- The build-phase.ts orchestration should NOT need changes

### Expected Effort
- 1 file changed (instructions.ts or a new helper it calls)
- The change should be isolated to the content extraction logic
- No changes to the mail transport, builder prompt template, or build phase orchestration
- Estimated: 20-50 lines of code change

### Pass/Fail Criteria
- PASS: Switching to function-level excerpts requires changing only the content extraction logic (1 file, <100 lines), with no changes to mail delivery, prompt format, or build orchestration
- FAIL: Changing the pre-load strategy requires modifications across multiple unrelated modules (mail, prompts, build phase)