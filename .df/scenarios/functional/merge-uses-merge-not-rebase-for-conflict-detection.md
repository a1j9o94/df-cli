---
name: merge-uses-merge-not-rebase-for-conflict-detection
type: functional
spec_id: run_01KJRKACB26XMX8A0GG81GBA6N
created_by: agt_01KJRPR4XJ6ZFBG0V4A4PKQJ6M
---

The spec explicitly states: Attempt git merge --no-commit for each branch sequentially (not rebase — merge handles 3-way better). The current implementation uses git rebase first, then git merge. The spec requires git merge --no-commit as the primary merge strategy because it produces better 3-way conflict markers.

VERIFICATION:
1. Check the sequential merge flow in rebase-merge.ts
2. The primary merge command should be git merge --no-commit (not git rebase followed by git merge)
3. Conflict detection should happen at the git merge step, not the git rebase step

EXPECTED:
- The sequential merge uses git merge --no-commit for each branch
- Conflicts are detected from the merge step, not a prior rebase
- 3-way merge markers are available for the agent to read

PASS CRITERIA:
- The merge flow does NOT rebase before merging (or makes rebase optional)
- git merge --no-commit is the primary conflict-producing step
- Conflict detection reads the merge conflict markers produced by git merge