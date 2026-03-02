---
name: evaluator-receives-spec-content
type: functional
spec_id: run_01KJP6GK3B3RYANRP51CFYXDF7
created_by: agt_01KJP6GK3CC8RV8Q8WDC17DRVD
---

PRECONDITIONS: A pipeline run has reached the evaluator phase. The run was initiated from a spec (e.g., spec_01KJP6FZEQJ9H6QG82KQ93ZRVR.md) with title, problem, requirements, and scenarios sections.

STEPS:
1. Inspect the mail message sent to the evaluator agent.
2. Look for the spec content in the mail body.
3. Verify the spec content includes:
   - The spec title
   - The Problem section
   - The Requirements section
   - Enough content for the evaluator to compare intent vs implementation

EXPECTED OUTPUT:
- The evaluator's mail body includes the original spec content (or a comprehensive summary).
- The spec is included inline, not as a file path reference.

PASS CRITERIA:
- The spec's Problem section text appears in the mail body.
- The spec's Requirements section text appears in the mail body.
- The evaluator can understand what was requested without reading any external files.

FAIL CRITERIA:
- Mail contains no spec content.
- Mail says 'read the spec at specs/...' without including content.
- Only the spec title is included without the requirements.