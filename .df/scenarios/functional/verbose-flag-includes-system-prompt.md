---
name: verbose-flag-includes-system-prompt
type: functional
spec_id: run_01KJQEP7BHVFD7GS7YYJDWFWJH
created_by: agt_01KJQEP7BJ05Z2KCGS05N3R3ZW
---

## Test: --verbose flag includes system_prompt in JSON output

### Preconditions
- Dark Factory project initialized with state.db
- At least 1 agent exists with a non-null system_prompt containing newlines and tabs

### Steps
1. Run: dark agent list --json --verbose
2. Parse the JSON output
3. Inspect each agent object for system_prompt field
4. Verify system_prompt value matches what is stored in the database
5. Verify the JSON is still valid (parseable by python3, jq, JSON.parse)

### Expected Output
- JSON array of agent objects, each containing system_prompt field
- system_prompt values are non-null strings for agents that have prompts
- The entire output is valid JSON despite containing control characters in system_prompt

### Verification Command
dark agent list --json --verbose | python3 -c "
import sys, json
agents = json.load(sys.stdin)
has_prompt = [a for a in agents if a.get('system_prompt')]
assert len(has_prompt) > 0, 'Expected at least one agent with system_prompt'
for a in has_prompt:
    assert isinstance(a['system_prompt'], str), 'system_prompt should be a string'
    assert len(a['system_prompt']) > 0, 'system_prompt should be non-empty'
print('PASS:', len(has_prompt), 'agents have system_prompt included')
"

### Pass/Fail Criteria
- PASS: --verbose causes system_prompt to appear in output AND output is valid JSON
- FAIL: --verbose flag not recognized, OR system_prompt missing, OR JSON is invalid