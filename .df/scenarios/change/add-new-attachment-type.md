---
name: add-new-attachment-type
type: change
spec_id: run_01KK7SEAJYN7NS72QQARJ3QEKA
created_by: agt_01KK7SEAJZB0HYJMAJBXMD3R8E
---

## Change: Add support for .sketch and .fig file formats

### Modification Description
Add .sketch and .fig to the list of supported attachment formats. Currently supported: PNG, JPG, SVG, PDF, WEBP.

### Expected Changes
1. Find the allowed extensions list (likely in src/commands/spec/attach.ts or a constants file)
2. Add 'sketch' and 'fig' to the allowed list
3. Optionally add MIME type mappings for these formats

### Affected Areas
- Only the file extension validation logic in the attach command
- No pipeline changes, no builder/evaluator changes, no worktree changes

### Expected Effort
- 1-2 lines of code changed (adding extensions to an array/set)
- No test changes needed beyond adding the new extensions to any validation tests
- Should take <5 minutes

### Pass/Fail Criteria
- PASS: Change requires only adding extensions to a single list/constant, no pipeline or infrastructure changes
- FAIL: Change requires modifications to multiple files or pipeline logic