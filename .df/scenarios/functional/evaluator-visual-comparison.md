---
name: evaluator-visual-comparison
type: functional
spec_id: run_01KK7SEAJYN7NS72QQARJ3QEKA
created_by: agt_01KK7SEAJZB0HYJMAJBXMD3R8E
---

## Test: Evaluator compares mockup to built output

### Setup
1. Initialize Dark Factory project
2. Create spec for a simple HTML page
3. Attach a mockup PNG to the spec
4. Build the spec (builder creates an HTML page)
5. Merge builder output

### Steps
1. During evaluate phase, verify the evaluator prompt includes:
   a. Paths to mockup attachments
   b. Instructions to compare visual output against mockup
2. Verify evaluator instructions include guidance on screenshot capability (dark eval screenshot)
3. Verify evaluator prompt describes visual scoring dimensions: layout, color, typography, overall
4. Verify the VisualScore type is used: { layout: number, color: number, typography: number, overall: number } with range 0.0-1.0

### Expected Output
- Evaluator prompt includes attachment paths
- Evaluator has instructions for visual comparison workflow
- Visual scoring dimensions are defined in the evaluator instructions
- dark eval screenshot command is available

### Pass/Fail Criteria
- PASS: Evaluator prompt includes all visual comparison guidance, attachment paths, and scoring criteria
- FAIL: Missing attachment paths, no visual comparison instructions, or no scoring dimensions