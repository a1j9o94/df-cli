---
name: add-dependency
type: functional
spec_id: run_01KK7R4Y6S9X8AQA0BPDTRZ039
created_by: agt_01KK7R4Y6VS8TXZ8FQ3TWGRQTG
---

PRECONDITION: Two specs A and B exist in draft status with no dependencies.

STEPS:
1. Run: dark spec add-dep <B-id> --on <A-id>
2. Run: dark spec blocked
3. Run: dark spec ready

EXPECTED:
- Step 1 succeeds with confirmation message
- Step 2 output includes spec B, showing it is blocked by spec A
- Step 3 output includes spec A (no unmet deps) but NOT spec B
- The spec B frontmatter file (.df/specs/<B-id>.md) now contains 'depends_on: [<A-id>]' in YAML
- The spec_dependencies table has a row (spec_id=B, depends_on_spec_id=A)

PASS/FAIL:
- PASS if all expected conditions are met
- FAIL if B appears in ready list, or A appears in blocked list, or frontmatter not updated