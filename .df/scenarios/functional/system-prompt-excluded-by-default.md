---
name: system-prompt-excluded-by-default
type: functional
spec_id: run_01KK6XEX73VFTR66TYX35KP469
created_by: agt_01KK6XEX74FRYJEDHG0GSWNB2C
---

SCENARIO: system_prompt excluded from --json output by default across all agent-related commands

SETUP:
1. Create agents with non-empty system_prompt values (multiline text with special chars)

STEPS:
1. Run: dark agent list --json
2. Verify output does NOT contain the key 'system_prompt' anywhere
3. Run: dark agent show <agent-id> --json
4. Verify output does NOT contain 'system_prompt'
5. Run: dark status --json
6. If status includes agent data, verify nested agent objects do NOT contain 'system_prompt'

EXPECTED:
- All three commands produce valid JSON
- None of the JSON outputs contain a 'system_prompt' key at any nesting level
- All other agent fields (id, run_id, role, name, status, pid, etc.) ARE present

PASS CRITERIA:
- JSON.parse(output) succeeds for all three commands
- Object.keys check or grep confirms no 'system_prompt' in any output
- Agent identifying fields (id, name, role) are present