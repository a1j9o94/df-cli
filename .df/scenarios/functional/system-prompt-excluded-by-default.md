---
name: system-prompt-excluded-by-default
type: functional
spec_id: run_01KJP6GSHWMZED4PZV683YAQNR
created_by: agt_01KJP6GSHX4V399DJ40R87K3YJ
---

## System Prompt Excluded by Default

### Preconditions
- A Dark Factory project is initialized
- At least one agent exists with a non-null system_prompt field (any content)

### Setup Steps
1. Ensure at least one agent has system_prompt set (the standard pipeline creates agents with system prompts from src/agents/prompts/)

### Test Execution
Run: dark agent list --json

### Expected Output
- Valid JSON array of agent objects
- NONE of the agent objects contain a 'system_prompt' key
- Verify: dark agent list --json | python3 -c "import sys,json; data=json.load(sys.stdin); assert all('system_prompt' not in a for a in data), 'system_prompt found in output'"

### Additional Validation
- The output should be noticeably smaller than if system_prompt were included
- All other agent fields (id, run_id, role, name, status, pid, module_id, etc.) should still be present

### Pass/Fail Criteria
- PASS: No agent object in the JSON output contains 'system_prompt' key
- FAIL: Any agent object contains 'system_prompt' key