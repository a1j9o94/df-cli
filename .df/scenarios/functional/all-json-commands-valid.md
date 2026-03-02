---
name: all-json-commands-valid
type: functional
spec_id: run_01KJP6GSHWMZED4PZV683YAQNR
created_by: agt_01KJP6GSHX4V399DJ40R87K3YJ
---

## All JSON Commands Produce Valid JSON

### Preconditions
- A Dark Factory project is initialized with at least:
  - One run in the runs table
  - One agent (with system_prompt containing control chars)
  - One spec
  - One scenario file in .df/scenarios/functional/

### Setup Steps
1. Initialize a project (dark init) if needed
2. Create test data in the DB covering all entity types
3. Create at least one scenario file at .df/scenarios/functional/test-scenario.md

### Test Execution
Run each of these commands and pipe to a JSON validator:

1. dark agent list --json | python3 -c "import sys,json; json.load(sys.stdin); print('agent list: OK')"
2. dark status --json | python3 -c "import sys,json; json.load(sys.stdin); print('status: OK')"
3. dark spec list --json | python3 -c "import sys,json; json.load(sys.stdin); print('spec list: OK')"
4. dark scenario list --json | python3 -c "import sys,json; json.load(sys.stdin); print('scenario list: OK')"

### Expected Output
- All four commands exit with code 0
- All four produce valid JSON

### Additional Validation
- Also pipe each to jq . to verify
- Check that dark status --json --run-id <run_id> also produces valid JSON (this path includes agent data)
- The status command's agent data should also NOT include system_prompt unless --verbose is used (if applicable)

### Pass/Fail Criteria
- PASS: ALL four commands produce valid JSON parseable by both Python and jq
- FAIL: ANY command produces invalid JSON