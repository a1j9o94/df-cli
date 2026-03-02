---
name: spec-without-scenarios-section-fails
type: functional
spec_id: run_01KJNF64GVR41BMXTX31QTJNWM
created_by: agt_01KJNF64GX2YYGE47G287VPZ1V
---

## Test: Spec with no ## Scenarios section causes clear failure

### Preconditions
- A spec file exists in .df/specs/ that has NO ## Scenarios section (the heading is completely absent)
- .df/scenarios/functional/ is empty
- .df/scenarios/change/ is empty

### Steps
1. Run `dark build --skip-architect` targeting this spec
2. Observe what happens during the pre-build scenario extraction

### Expected Results
- The extractScenariosFromSpec function returns 0 (no scenarios found)
- Since --skip-architect was used AND extraction yielded 0 scenarios, the pipeline fails
- Error message clearly tells the user to add scenarios to the spec, e.g.: 'No scenarios found in spec. Add a ## Scenarios section with test scenarios to your spec file.'
- No builder agents are spawned
- The run status is 'failed'

### Pass/Fail Criteria
- PASS: Pipeline fails with a user-actionable error message mentioning the spec needs a ## Scenarios section
- FAIL: Pipeline starts build without scenarios, or error message is cryptic/unhelpful