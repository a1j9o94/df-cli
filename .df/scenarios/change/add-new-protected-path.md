---
name: add-new-protected-path
type: change
spec_id: run_01KJP6FN10E981ZTJDAYHGHVXQ
created_by: agt_01KJP6FN18BEE7QPK06ETWXPQH
---

## Add New Protected Path

### Modification Description
Add a new file pattern '.df/buildplans/' to the list of files that should never be merged from worktree branches and should be excluded from worktree commits.

### Expected Changes
1. Update the protected paths configuration (e.g., PROTECTED_PATTERNS array or equivalent) to include '.df/buildplans/'
2. The worktree .gitignore template should automatically include the new pattern (no separate update needed if generated from the same config)
3. The merger sanitization should automatically strip the new pattern (no separate update needed if reading from the same config)

### Affected Areas
- Protected paths config: ONE location (single source of truth for all patterns)
- No changes to worktree creation logic (reads from config)
- No changes to merge sanitization logic (reads from config)
- No changes to merger completion guard (reads from config)

### Expected Effort
- 1 line change: Add '.df/buildplans/' to the PROTECTED_PATTERNS array (or equivalent config)
- No structural changes, no new files, no logic changes
- Estimated: < 2 minutes

### Pass/Fail Criteria
- PASS: Adding a new protected path requires only updating the pattern list in ONE location, and all guards (worktree gitignore, merge sanitization, completion checks) automatically respect it
- FAIL: Adding a new path requires updating multiple locations, or requires changes to logic/structure beyond the pattern list