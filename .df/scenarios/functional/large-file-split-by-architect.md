---
name: large-file-split-by-architect
type: functional
spec_id: run_01KJQ3RPWCVM02YZ86GB23AHTX
created_by: agt_01KJQ3RPWEX5P5Z3N2EG0ASHGW
---

## Scenario: Large file split by architect

### Preconditions
- A spec requires modifying a single file that is 500+ lines long in 3 different ways (e.g., add function A, add function B, refactor function C)
- The architect agent is analyzing this spec

### Test Steps
1. Create a spec that explicitly requires 3 modifications to a file >300 lines
2. Run the architect phase
3. Inspect the submitted buildplan (modules array)

### Expected Results
- The architect creates 3 separate sub-modules instead of 1 large module
- Each sub-module touches at most 1-2 existing files
- Each sub-module has a focused scope (e.g., 'add function A to engine.ts' rather than 'modify engine.ts to add A, B, and C')
- The architect prompt includes guidance about splitting large file edits
- Dependencies between sub-modules are correctly specified (e.g., sub-module 2 depends on sub-module 1 if they modify the same file section)

### Pass/Fail Criteria
- PASS: Buildplan has 3+ modules for what could have been 1 module targeting a large file; architect prompt contains splitting guidance
- FAIL: Single module assigned to modify a 500-line file in 3 ways