---
name: status-command-excludes-system-prompt
type: functional
spec_id: run_01KJQEP7BHVFD7GS7YYJDWFWJH
created_by: agt_01KJQEP7BJ05Z2KCGS05N3R3ZW
---

## Test: status --json excludes system_prompt from embedded agents

### Preconditions
- Dark Factory project initialized with state.db
- At least 1 run exists with agents that have non-null system_prompt

### Steps
1. Run: dark status --run-id <run-id> --json
2. Parse the JSON output
3. Navigate to the 'agents' array in the response
4. Inspect each agent object for system_prompt field

### Expected Output
- JSON object with run, agents, and mergeQueue fields
- The agents array contains agent objects WITHOUT system_prompt field
- All other agent fields are present

### Verification Command
dark status --run-id <run-id> --json | python3 -c "
import sys, json
data = json.load(sys.stdin)
agents = data.get('agents', [])
for a in agents:
    assert 'system_prompt' not in a, f'system_prompt found in agent {a["id"]}'
print('PASS: system_prompt excluded from', len(agents), 'agents in status output')
"

### Also verify --verbose works:
dark status --run-id <run-id> --json --verbose | python3 -c "
import sys, json
data = json.load(sys.stdin)
agents = data.get('agents', [])
has_prompt = [a for a in agents if 'system_prompt' in a]
print('PASS:', len(has_prompt), 'agents have system_prompt in verbose status output')
"

### Pass/Fail Criteria
- PASS: system_prompt excluded in default mode, included in verbose mode, JSON always valid
- FAIL: system_prompt leaks in default mode OR verbose flag not recognized OR JSON invalid