---
name: rebase-before-merge
type: functional
spec_id: run_01KJNGCK0ZM1B3T719X3QA8VM9
created_by: agt_01KJNGCK11QAJVMVVZDNK6HEDG
---

## Rebase Before Merge: Build B Rebases onto Post-A Main

### Preconditions
- A git repo with main branch containing `engine.ts` with original content
- Build A's branch modifies line 10 of engine.ts (adds import statement)
- Build B's branch modifies line 50 of engine.ts (adds new function)
- Build A merges first, changing main

### Setup Steps
1. Create main branch with engine.ts (100+ lines)
2. Create branch-A from main: modifies line 10 (adds `import { Lock } from './lock'`)
3. Create branch-B from main (same base commit): modifies line 50 (adds `function processQueue() {}`)
4. Merge branch-A into main first (main now has A's changes)

### Test Steps
1. Build B reaches merge phase after A has already merged
2. Merger for B acquires lock
3. Merger for B rebases branch-B onto current main (which now includes A's changes)
4. Rebase succeeds (changes are in different locations — non-overlapping)
5. Merger for B merges rebased branch into main
6. Release lock

### Expected Outputs
- After rebase: branch-B's base commit matches post-A main HEAD
- After merge: main contains BOTH A's import on line 10 AND B's function on line 50
- git log shows clean linear history (rebase, not merge commit from B's original base)
- No conflict markers in any file

### Pass/Fail Criteria
- PASS: Final main has both changes, rebase was performed (branch-B parent is post-A main), no conflicts
- FAIL: Merge conflict occurs, OR B merges without rebasing (B's parent is still pre-A main), OR either change is missing