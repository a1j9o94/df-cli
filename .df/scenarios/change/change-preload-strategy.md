---
name: change-preload-strategy
type: change
spec_id: run_01KJP8WZ5DKH52F4S0SWCGKJWW
created_by: agt_01KJP8WZ5FJ90GR22QSDS2FYR3
---

## Changeability Scenario: Switch pre-load strategy from full file to function-level excerpt

### Modification Description
Change the file pre-loading logic from 'include the full file content (up to 200 lines)' to 'include only function-level excerpts based on what the module needs to modify'. For example, if the module scope says it modifies the sendInstructions() method in engine.ts, only include that method plus its surrounding context (imports, class declaration) — not the entire 1136-line file.

### Affected Areas
- src/utils/file-excerpt.ts (the content extraction logic — this is the ONLY file that should need changes)
- The builder mail body format should NOT change (still a markdown section with file content)
- The engine.ts sendInstructions method should NOT change (it calls the extraction utility and passes the result)

### Expected Effort
- 1 file changed: src/utils/file-excerpt.ts (or equivalent content extraction module)
- ~20-50 lines of new logic for function-level AST parsing or regex-based extraction
- No changes to engine.ts, builder.ts, or the mail system
- Existing tests for the utility should be updatable without restructuring

### Pass/Fail Criteria
- PASS: Changing the extraction strategy requires modifying ONLY the content extraction utility, not the mail delivery pipeline or prompt templates
- FAIL: Changing extraction strategy requires modifying engine.ts sendInstructions, builder.ts prompt, or the message DB schema