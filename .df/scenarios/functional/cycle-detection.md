---
name: cycle-detection
type: functional
spec_id: run_01KK7R4Y6S9X8AQA0BPDTRZ039
created_by: agt_01KK7R4Y6VS8TXZ8FQ3TWGRQTG
---

PRECONDITION: Three specs A, B, C exist in draft status.

SETUP:
1. Run: dark spec add-dep B --on A (B depends on A) — succeeds
2. Run: dark spec add-dep C --on B (C depends on B) — succeeds

TEST:
3. Run: dark spec add-dep A --on C (A depends on C — would create cycle A→C→B→A)

EXPECTED:
- Step 3 FAILS with an error message containing 'cycle' (case-insensitive)
- The dependency A→C is NOT added to spec_dependencies table
- The spec A frontmatter does NOT contain depends_on with C
- Exit code is non-zero

EDGE CASES:
- Self-dependency: dark spec add-dep A --on A should also be rejected as a cycle

PASS/FAIL:
- PASS if cycle is detected and rejected with appropriate error
- FAIL if the dependency is added, or if error message does not mention cycle