---
name: verbose-includes-prompt
type: functional
spec_id: run_01KJP6GSHWMZED4PZV683YAQNR
created_by: agt_01KJP6GSHX4V399DJ40R87K3YJ
---

## Verbose Flag Includes System Prompt

### Preconditions
- A Dark Factory project is initialized
- At least one agent exists with a non-null system_prompt field containing multiline content with control characters (newlines, tabs)

### Setup Steps
1. Ensure at least one agent has system_prompt set with content like:
   'You are an architect agent.\n\nYour task:\n\t- Analyze the spec\n\t- Decompose into modules\n\nIMPORTANT: Follow these steps.'

### Test Execution
Run: dark agent list --json --verbose

### Expected Output
- Valid JSON array of agent objects
- Each agent object with a non-null system_prompt in the DB DOES contain a 'system_prompt' key
- The JSON is still valid (parseable by all standard parsers)
- Verify validity: dark agent list --json --verbose | python3 -c "import sys,json; data=json.load(sys.stdin); print('OK'); [print(f'Agent {a["id"]}: has prompt = {"system_prompt" in a}') for a in data]"
- Verify prompt present: dark agent list --json --verbose | python3 -c "import sys,json; data=json.load(sys.stdin); agents_with_prompt=[a for a in data if 'system_prompt' in a]; assert len(agents_with_prompt)>0, 'No agents have system_prompt in verbose output'"

### Pass/Fail Criteria
- PASS: --verbose output includes system_prompt field AND is valid JSON (parseable by Python, jq, Node)
- FAIL: --verbose output either (a) doesn't include system_prompt, OR (b) produces invalid JSON