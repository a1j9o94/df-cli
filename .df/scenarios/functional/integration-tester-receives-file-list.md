---
name: integration-tester-receives-file-list
type: functional
spec_id: run_01KJP6GK3B3RYANRP51CFYXDF7
created_by: agt_01KJP6GK3CC8RV8Q8WDC17DRVD
---

PRECONDITIONS: A pipeline run has completed the build phase. At least 2 builders have completed, each creating/modifying files in their worktrees (e.g., builder-a created src/auth.ts and tests/auth.test.ts; builder-b modified src/api.ts).

STEPS:
1. Inspect the mail message sent to the integration-tester agent.
2. Look for a section listing files each builder created or modified.
3. Verify the file list is per-builder (not a flat list) — each builder's files should be grouped under its module name.

EXPECTED OUTPUT:
- The mail body contains a file list section.
- Files are grouped by module/builder.
- Both created and modified files are shown.

PASS CRITERIA:
- At least one builder's files appear in the mail.
- Files are identified per-module (not a single flat list).
- The file paths are specific (e.g., 'src/auth.ts' not just 'some files').

FAIL CRITERIA:
- No file list section exists in the mail.
- Files are shown as a flat list without per-module grouping.
- File list is empty or says '(no files)'.