---
name: spec-without-scenarios-section-fails
type: functional
spec_id: run_01KJSRR03H5TJJK751YJTQGN37
created_by: agt_01KJSRR03JR60D5QRHPZKHDX69
---

## Scenario: Spec with no Scenarios section fails on skip-architect

### Preconditions
- A Dark Factory project is initialized
- A spec exists that has NO `## Scenarios` section at all
- No scenario files exist in `.df/scenarios/`

### Steps
1. Create a spec markdown file with normal content but no `## Scenarios` heading
2. Run the pipeline engine with `skipArchitect: true`
3. The pre-build gate triggers and attempts to extract scenarios from the spec

### Expected Results
- The `extractScenariosFromSpec()` function parses the spec and finds no `## Scenarios` section
- It returns 0 scenarios extracted
- The gate detects 0 scenarios after extraction attempt
- The pipeline fails with a clear error message telling the user to add scenarios to the spec
- Error message should indicate that the spec needs a `## Scenarios` section
- No scenario files are created on disk

### Pass/Fail Criteria
- PASS: Pipeline fails with a clear, actionable error message about missing scenarios section in spec
- FAIL: Pipeline proceeds without scenarios, OR error message is cryptic/unhelpful, OR an exception trace is shown without context