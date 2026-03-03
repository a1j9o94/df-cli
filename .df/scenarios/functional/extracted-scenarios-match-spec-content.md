---
name: extracted-scenarios-match-spec-content
type: functional
spec_id: run_01KJSRR03H5TJJK751YJTQGN37
created_by: agt_01KJSRR03JR60D5QRHPZKHDX69
---

## Scenario: Extracted scenarios match spec content exactly

### Preconditions
- A Dark Factory project is initialized
- A spec exists with a `## Scenarios` section containing:
  - `### Functional` subsection with 3 items:
    1. **Login validation**: Verify login form rejects empty fields
    2. **Token refresh**: Verify expired tokens trigger refresh flow
    3. **Logout clears session**: Verify logout removes all session data
  - `### Changeability` subsection with 1 item:
    1. **Add OAuth provider**: Adding a new OAuth provider requires changes to auth config only

### Steps
1. Clear `.df/scenarios/functional/` and `.df/scenarios/change/`
2. Call `extractScenariosFromSpec(specFilePath, outputDir)`
3. Examine the created scenario files

### Expected Results
- 3 files created in `.df/scenarios/functional/`:
  - `Login_validation.md` (or similar sanitized name)
  - `Token_refresh.md`
  - `Logout_clears_session.md`
- 1 file created in `.df/scenarios/change/`:
  - `Add_OAuth_provider.md`
- Each file has YAML frontmatter with: name, type, spec_id
- Each file body contains the scenario description text from the spec
- The function returns 4 (total count of scenarios extracted)
- Filenames are sanitized (no special characters that break the filesystem)

### Pass/Fail Criteria
- PASS: All 4 files created with correct types, names match spec items, content includes descriptions, return value is 4
- FAIL: Wrong number of files, wrong types (functional in change dir or vice versa), missing content, wrong return value