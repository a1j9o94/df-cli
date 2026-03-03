---
name: add-new-attachment-type
type: change
spec_id: run_01KJT1F6EV2A1H0TKH6N55D515
created_by: agt_01KJT1F6EWZQATERS37B1QJ6TS
---

## Changeability Scenario: Add new attachment type (.sketch or .fig)

### Modification Description
Support .sketch (Sketch) or .fig (Figma) files as valid attachment types. Currently supported: PNG, JPG, SVG, PDF, WEBP.

### Expected Changes
1. A single constant/config array holds the list of allowed attachment extensions
2. Adding .sketch or .fig requires modifying ONLY this list (e.g., ALLOWED_EXTENSIONS array)
3. No pipeline changes should be needed (build-phase, instructions, evaluator unchanged)
4. Optionally: a converter plugin system could be added, but is not required for basic support

### Affected Areas
- The allowed extensions list in the spec attach command (1 file)
- Possibly the MIME type mapping if MIME type validation is used (same file or adjacent config)

### Expected Effort
- 1-2 lines of code change (adding extension to an array)
- No test changes needed beyond adding the new extension to the test data
- Zero changes to pipeline, builder prompts, evaluator prompts, or worktree isolation

### Pass/Fail Criteria
- PASS: Adding .sketch to the allowed list is a 1-3 line change in a single file, no pipeline logic touched
- FAIL: Supporting a new format requires changes across multiple files or pipeline components