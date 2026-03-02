---
name: merger-receives-branch-names-in-dependency-order
type: functional
spec_id: run_01KJP6GK3B3RYANRP51CFYXDF7
created_by: agt_01KJP6GK3CC8RV8Q8WDC17DRVD
---

PRECONDITIONS: A pipeline run with 3 modules has completed build + integration + evaluation phases. Modules have dependencies: module-c depends on module-b, module-b depends on module-a. Three builder agents have completed with worktree_paths set.

STEPS:
1. Inspect the mail message sent to the merger agent.
2. Look for a section listing worktree branches.
3. Verify the mail includes:
   - The exact git branch name for each builder worktree (not just the worktree path)
   - The dependency order for merging (module-a first, then module-b, then module-c)
   - The target branch name

EXPECTED OUTPUT:
- The mail lists builder branches in topological (dependency) order.
- Each entry includes: module ID, branch name, worktree path.
- The target branch is explicitly named.

PASS CRITERIA:
- All builder branches appear in the mail.
- Branches are listed in dependency order (leaves first, dependents last).
- Both the branch name AND worktree path are included for each builder.
- Target branch name is present.

FAIL CRITERIA:
- Mail says 'Worktrees to merge: /path/a, /path/b' without branch names.
- Branches are not in dependency order.
- Target branch is not explicitly stated.
- Any completed builder's branch is missing.