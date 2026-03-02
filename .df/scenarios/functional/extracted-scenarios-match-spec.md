---
name: extracted-scenarios-match-spec
type: functional
spec_id: run_01KJNF64GVR41BMXTX31QTJNWM
created_by: agt_01KJNF64GX2YYGE47G287VPZ1V
---

## Test: Extracted scenario filenames and content match the spec

### Preconditions
- A spec file with the following structure:
  ```markdown
  ## Scenarios
  ### Functional
  1. **Alpha Test**: Verify alpha behavior with input X, expect output Y.
  2. **Beta Test**: Verify beta handles edge case Z correctly.
  ### Changeability
  1. **Add gamma support**: Adding gamma type should only require changes to parser and directory config, no engine changes.
  ```
- .df/scenarios/ directories are empty

### Steps
1. Call extractScenariosFromSpec(specFilePath, outputDir) on the spec above
2. Inspect the created files in .df/scenarios/functional/ and .df/scenarios/change/

### Expected Results
- .df/scenarios/functional/ contains 2 files (one for each numbered functional scenario)
- .df/scenarios/change/ contains 1 file (one for the changeability scenario)
- Filenames are derived from scenario names (e.g., Alpha_Test.md, Beta_Test.md, Add_gamma_support.md) — special characters replaced with underscores
- Each file has frontmatter: name, type (functional or change), spec_id
- Each file body contains the scenario description text from the spec
- Function returns 3 (total count of scenarios created)

### Pass/Fail Criteria
- PASS: All 3 scenario files exist with correct names, types, frontmatter, and body content matching the spec. Return value is 3.
- FAIL: Wrong file count, wrong filenames, missing frontmatter fields, body content doesn't match spec, or return value is wrong