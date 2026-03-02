---
name: skip-architect-creates-scenarios
type: functional
spec_id: run_01KJNF64GVR41BMXTX31QTJNWM
created_by: agt_01KJNF64GX2YYGE47G287VPZ1V
---

## Test: Skip-architect creates scenarios from spec

### Preconditions
- A spec file exists at .df/specs/ with a ## Scenarios section containing 4 numbered functional scenarios under ### Functional
- .df/scenarios/functional/ is empty (no .md files)
- .df/scenarios/change/ is empty

### Steps
1. Run `dark build --skip-architect` targeting the spec
2. Before any builder agent is spawned, inspect .df/scenarios/functional/

### Expected Results
- .df/scenarios/functional/ contains exactly 4 .md files
- Each file has frontmatter with name, type: functional, and spec_id fields
- Each file body matches the corresponding numbered scenario from the spec's ## Scenarios > ### Functional section
- The pipeline log shows messages about scenario extraction (e.g. 'Extracted 4 scenarios from spec')
- Builder agents start AFTER scenarios are created, not before

### Pass/Fail Criteria
- PASS: 4 scenario files exist in .df/scenarios/functional/ with content matching the spec, and build phase proceeds
- FAIL: Fewer than 4 files, files have wrong content, or build starts before scenarios are written