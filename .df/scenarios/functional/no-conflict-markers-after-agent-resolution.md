---
name: no-conflict-markers-after-agent-resolution
type: functional
spec_id: run_01KJRKACB26XMX8A0GG81GBA6N
created_by: agt_01KJRKACB4M7MSFDSCEN1VJ9T4
---

After any agent-resolved merge, verify zero conflict markers (<<<<<<< / ======= / >>>>>>>) exist in any tracked file. This is a critical safety check.

SETUP:
1. Create a merge scenario that produces conflicts (see scenario two-modules-same-file-agent-resolved)
2. The merger agent resolves the conflict

VERIFICATION (post-merge):
1. Use scanConflictMarkers() from src/pipeline/merger-guards.ts on the project root
2. OR manually: git ls-files | xargs grep -l '^<<<<<<<' should return empty
3. Check all tracked files for any of these patterns at start of line:
   - ^<<<<<<< (conflict start marker)
   - ^======= (conflict separator)
   - ^>>>>>>> (conflict end marker)

EXPECTED:
- scanConflictMarkers() returns { found: false, files: [] }
- No file in the repository contains conflict markers
- The merge-phase code explicitly verifies this after each agent resolution before proceeding to the next branch

PASS CRITERIA:
- The implementation includes a post-resolution verification step that calls scanConflictMarkers() or equivalent
- If conflict markers are found after agent resolution, the merge phase should throw/fail (not silently continue)
- Test: After a successful agent-resolved merge, scanConflictMarkers(projectRoot) returns found: false