---
name: skip-architect-auto-extracts-scenarios
type: functional
spec_id: run_01KJSRR03H5TJJK751YJTQGN37
created_by: agt_01KJSRR03JR60D5QRHPZKHDX69
---

## Scenario: Skip-architect creates scenarios from spec

### Preconditions
- A Dark Factory project is initialized with `dark init`
- A spec exists with an `## Scenarios` section containing:
  - `### Functional` subsection with 4 numbered items
  - Each item has a bold name and description

### Steps
1. Ensure `.df/scenarios/functional/` is empty (no .md files)
2. Invoke the pipeline engine's `execute()` method with `skipArchitect: true`
3. Observe the pipeline before it enters the build phase

### Expected Results
- Before build phase starts, the engine detects no scenarios exist
- Since `--skip-architect` was used, the engine calls `extractScenariosFromSpec()` on the spec
- 4 .md files are created in `.df/scenarios/functional/`
- Each file contains frontmatter with name, type, spec_id fields
- Each file contains the scenario description from the spec
- The build phase proceeds (does not throw)
- A log message indicates scenarios were auto-extracted

### Pass/Fail Criteria
- PASS: 4 scenario files exist in `.df/scenarios/functional/` with correct content before builders are spawned
- FAIL: Build starts without scenarios, OR fewer than 4 scenarios are created, OR extraction throws an error