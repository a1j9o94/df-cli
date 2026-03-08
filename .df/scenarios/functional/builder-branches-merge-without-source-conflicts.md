---
name: builder-branches-merge-without-source-conflicts
type: functional
spec_id: run_01KK6QXFCV1988195YMPGM2QCS
created_by: agt_01KK6T260P6J76XFHYA5TD7C95
---

SCENARIO: All builder branches for this spec must merge cleanly to main without source code conflicts.

PRECONDITION: Three builder branches exist: agent-show, agent-list-enrich, status-enrich.

STEPS:
1. Attempt to merge all three branches to main sequentially.
2. Check for merge conflicts.

EXPECTED:
- Source files (.ts in src/) merge cleanly.
- Test file conflicts are acceptable (add/add on same test file from different branches).
- No conflicting implementations of the same function.

PASS CRITERIA:
- Source files (src/**/*.ts) have no merge conflicts.
- Or: branches are structured such that each module builds on main without overlapping source changes.

FAIL CRITERIA:
- Source files have merge conflicts requiring manual resolution.
- Overlapping implementations that would break at runtime after merge.