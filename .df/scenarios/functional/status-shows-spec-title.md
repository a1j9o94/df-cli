---
name: status-shows-spec-title
type: functional
spec_id: run_01KJQERB5P8DCWZJXCZR5Z64BW
created_by: agt_01KJQERB5RN11QM94PWHDCE5WH
---

SCENARIO: 'dark status' shows the spec title alongside the spec ID.

SETUP:
1. Initialize dark factory project
2. Create a spec with title 'Enrich CLI output: never need raw sqlite' (or any known title)
3. Start a build for that spec

TEST STEPS:
1. Run 'dark status'
2. Examine the output for each run line

EXPECTED OUTPUT:
In the summary list:
  run_01XYZ  running  spec=spec_01ABC "Enrich CLI output"  phase=build  ...

In the detailed view (dark status --run-id <id>):
  Run: run_01XYZ
    Spec:      spec_01ABC "Enrich CLI output: never need raw sqlite"
    ...

PASS CRITERIA:
- The spec title appears in the status output, not just the spec ID
- In summary list mode: title shown inline (may be truncated for long titles)
- In single-run detail mode: full title shown on the Spec line
- Title is fetched from specs table by joining on run.spec_id
- If spec is missing from DB (orphaned run), show spec ID only without crashing

FAIL CRITERIA:
- Only spec_id shown, no title
- Crash when spec record is missing
- Title shown as 'undefined' or 'null'