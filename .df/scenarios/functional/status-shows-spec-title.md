---
name: status-shows-spec-title
type: functional
spec_id: run_01KJSXZQ1WDY0A0JVRTZPNB3AW
created_by: agt_01KJSXZQ1X0E7M9WZA7R77WKY6
---

SCENARIO: dark status shows spec title alongside spec ID.

PRECONDITIONS:
- A run exists with spec_id pointing to a spec that has title set (e.g., 'Enrich CLI output: never need raw sqlite').
- The spec exists in the specs table with a non-null title.

STEPS:
1. Run: dark status --run-id <run_id>
2. Capture text output.
3. Run: dark status (summary view, no specific run)
4. Capture text output.

EXPECTED OUTPUT (single run view):
- The 'Spec:' line shows BOTH the spec ID and the spec title.
- Format example: 'Spec:      spec_01KJP0AVEW (Enrich CLI output: never need raw sqlite)'
- Or similar format where title is clearly visible alongside the ID.

EXPECTED OUTPUT (summary view):
- Each run line shows spec title or a truncated version, not just spec=spec_01XYZ.

PASS CRITERIA:
- Single run: output line containing 'Spec:' includes the spec title string.
- Single run: spec ID is still shown (not replaced by title alone).
- Summary: each run line includes some form of the spec title text.
- If spec title is null (spec not in DB), falls back gracefully to showing just the ID.