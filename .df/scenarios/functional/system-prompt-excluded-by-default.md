---
name: system-prompt-excluded-by-default
type: functional
spec_id: run_01KJQEP7BHVFD7GS7YYJDWFWJH
created_by: agt_01KJQEP7BJ05Z2KCGS05N3R3ZW
---

## Test: system_prompt excluded from --json output by default

### Preconditions
- Dark Factory project initialized with state.db
- At least 1 agent exists with a non-null system_prompt field

### Steps
1. Run: dark agent list --json
2. Parse the JSON output
3. Inspect each agent object in the returned array
4. Check for the presence of the 'system_prompt' key

### Expected Output
- The JSON array contains agent objects
- NO agent object contains a 'system_prompt' key
- All other AgentRecord fields are present (id, run_id, role, name, status, pid, module_id, cost_usd, tokens_used, etc.)

### Verification Command
dark agent list --json | python3 -c "
import sys, json
agents = json.load(sys.stdin)
for a in agents:
    assert 'system_prompt' not in a, f'system_prompt found in agent {a["id"]}'
    assert 'id' in a, 'id field missing'
    assert 'role' in a, 'role field missing'
    assert 'status' in a, 'status field missing'
print('PASS: system_prompt correctly excluded from all', len(agents), 'agents')
"

### Pass/Fail Criteria
- PASS: No agent object in the JSON output contains system_prompt field
- FAIL: Any agent object contains system_prompt field