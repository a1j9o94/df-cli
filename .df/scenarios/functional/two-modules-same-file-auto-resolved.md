---
name: two-modules-same-file-auto-resolved
type: functional
spec_id: run_01KJRKACB26XMX8A0GG81GBA6N
created_by: agt_01KJRKACB4M7MSFDSCEN1VJ9T4
---

Two parallel builders add new functions to the same file but in different, non-overlapping locations. The merge should succeed automatically without needing the merger agent for conflict resolution.

SETUP:
1. Create a git repo with initial commit containing src/shared.ts with content:
   // Section A (line 1-10)
   export function existingA() { return 'a'; }
   
   // gap
   
   // Section B (line 20-30)
   export function existingB() { return 'b'; }

2. Create worktree branch 'builder-mod-a' that adds a new function after Section A:
   export function newFromModA() { return 'modA'; }

3. Create worktree branch 'builder-mod-b' that adds a new function after Section B:
   export function newFromModB() { return 'modB'; }

EXECUTION:
1. Call executeMergePhase() with both worktree paths
2. Branch builder-mod-a merges first (should be clean, no conflict)
3. Branch builder-mod-b merges second (should also be clean — different locations in file)

EXPECTED:
- MergeResult/equivalent shows both branches merged successfully
- No merger agent spawned for conflict resolution (agent may still spawn for post-merge validation)
- The final src/shared.ts contains BOTH newFromModA() and newFromModB()
- No conflict markers in any file (scanConflictMarkers returns found: false)

PASS CRITERIA:
- Both branches in mergedBranches list
- Zero failedBranches
- Final file contains both new functions
- No conflict markers anywhere