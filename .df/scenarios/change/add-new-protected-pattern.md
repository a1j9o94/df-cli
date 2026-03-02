---
name: add-new-protected-pattern
type: change
spec_id: run_01KJQQT8BDGGZEKPZN2WEF41K9
created_by: agt_01KJQQT8BFH68W87KWNKGGES7S
---

MODIFICATION: Add a new protected pattern '.vscode/' to PROTECTED_PATTERNS in src/runtime/protected-paths.ts. AFFECTED AREAS: The new worktree sanitization function (sanitize-worktree.ts or equivalent) must automatically pick up this new pattern without any code changes beyond the pattern array. EXPECTED EFFORT: Single-line change to PROTECTED_PATTERNS array. VERIFICATION: (1) Add '.vscode/' to PROTECTED_PATTERNS. (2) Create a worktree with a .vscode/settings.json file committed. (3) Call sanitizeWorktree(). (4) Verify .vscode/settings.json is removed from git tracking via git rm --cached. PASS CRITERIA: The sanitization function iterates PROTECTED_PATTERNS dynamically — adding a new pattern is automatically handled. No changes needed to sanitize-worktree.ts. FAIL CRITERIA: sanitizeWorktree has hardcoded paths instead of using PROTECTED_PATTERNS, requiring code changes when a new pattern is added.