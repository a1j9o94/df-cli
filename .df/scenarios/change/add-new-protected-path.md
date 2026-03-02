---
name: add-new-protected-path
type: change
spec_id: run_01KJQ3REAY3PPJ95V0NGGPB8WZ
created_by: agt_01KJQ3REAZSCFRXXN0X7HMFP16
---

## Changeability Test: Add new protected path

### Modification Description
Add a new file pattern `.df/cache/` to the 'never merge' protected paths list.

### Expected Changes
1. Update the shared PROTECTED_FILE_PATTERNS constant (or equivalent) in ONE location
2. The worktree `.gitignore` template automatically includes the new pattern
3. The merger sanitization automatically excludes the new pattern from merges
4. The merger completion guard automatically checks for the new pattern

### Affected Areas
- The protected paths constant/template (ONE file)
- No structural changes to any module
- No changes to control flow or function signatures

### Expected Effort
- 1 line added to the protected paths array
- All consumers automatically pick up the change
- No test changes required (tests should parameterize on the shared list)
- Total: < 5 minutes, single-file change

### Pass Criteria
- Adding a new protected path requires changing ONLY the shared constant (1 file, 1 line)
- The gitignore template, merge sanitization, and completion guard all respect the new pattern
- No cascading changes needed across multiple files