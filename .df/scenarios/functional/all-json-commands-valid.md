---
name: all-json-commands-valid
type: functional
spec_id: run_01KJQEP7BHVFD7GS7YYJDWFWJH
created_by: agt_01KJQEP7BJ05Z2KCGS05N3R3ZW
---

## Test: All --json commands produce valid JSON

### Preconditions
- Dark Factory project initialized with state.db
- At least 1 run, 1 spec, 1 agent, and 1 scenario exist in the project

### Steps
Run each command and validate JSON output:

1. dark agent list --json | python3 -c 'import sys,json; json.load(sys.stdin); print("OK: agent list")'
2. dark status --json | python3 -c 'import sys,json; json.load(sys.stdin); print("OK: status")'
3. dark spec list --json | python3 -c 'import sys,json; json.load(sys.stdin); print("OK: spec list")'
4. dark scenario list --json | python3 -c 'import sys,json; json.load(sys.stdin); print("OK: scenario list")'
5. dark status --run-id <run-id> --json | python3 -c 'import sys,json; json.load(sys.stdin); print("OK: status run")'

Additional commands if data exists:
6. dark contract list --json | python3 -c 'import sys,json; json.load(sys.stdin); print("OK: contract list")'
7. dark mail check --agent <agent-id> --json | python3 -c 'import sys,json; json.load(sys.stdin); print("OK: mail check")'
8. dark resource status --json | python3 -c 'import sys,json; json.load(sys.stdin); print("OK: resource status")'
9. dark integrate status --json | python3 -c 'import sys,json; json.load(sys.stdin); print("OK: integrate status")'

### Expected Output
- Every command exits 0
- Every output is valid JSON (no parse errors)

### Pass/Fail Criteria
- PASS: ALL commands produce valid JSON
- FAIL: ANY command produces output that fails JSON parsing

### Notes
- scenario/list.ts currently uses raw JSON.stringify instead of formatJson — this should be fixed
- status command includes agents which contain system_prompt — verify exclusion works here too