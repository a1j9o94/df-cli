---
name: evaluator-receives-buildplan-summary-and-files
type: functional
spec_id: run_01KJP6GK3B3RYANRP51CFYXDF7
created_by: agt_01KJP6GK3CC8RV8Q8WDC17DRVD
---

PRECONDITIONS: A pipeline run has completed the build phase with 2+ modules built. The evaluator phase is about to start. Builder agents have created files in their worktrees.

STEPS:
1. Inspect the mail message sent to the evaluator agent.
2. Look for a Buildplan Summary section.
3. Look for a Files Created section.
4. Verify the buildplan summary includes:
   - Module IDs and titles
   - What each module was supposed to build (description)
5. Verify the files section includes:
   - Files created/modified by each builder
   - Grouped by module

EXPECTED OUTPUT:
- The evaluator's mail includes both a buildplan summary and files list.
- The evaluator knows WHAT was built (modules) and WHERE (files).

PASS CRITERIA:
- A buildplan summary section exists with module IDs and titles.
- A files section exists showing files per builder/module.
- The evaluator has enough context to locate and test the built code.

FAIL CRITERIA:
- No buildplan summary in the mail.
- No files list in the mail.
- The evaluator would need to explore the codebase blind to find what was built.