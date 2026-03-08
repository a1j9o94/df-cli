---
name: verbose-includes-system-prompt
type: functional
spec_id: run_01KK6XEX73VFTR66TYX35KP469
created_by: agt_01KK6XEX74FRYJEDHG0GSWNB2C
---

SCENARIO: --verbose flag includes system_prompt in JSON output, still valid JSON

SETUP:
1. Create an agent with system_prompt = 'Line1\nLine2\tTabbed\x00NullByte\x1FControlChar'

STEPS:
1. Run: dark agent list --json --verbose
2. Parse output with JSON.parse()
3. Verify parsed[0].system_prompt exists and equals the original prompt string
4. Run: dark agent show <agent-id> --json --verbose
5. Parse and verify system_prompt is present
6. Run: dark status --json --verbose
7. Parse and verify agent records contain system_prompt

EXPECTED:
- All outputs are valid JSON (parseable by JSON.parse, python json.loads, jq)
- system_prompt field IS present in agent objects
- system_prompt value matches the original string (control chars properly escaped/unescaped)

PASS CRITERIA:
- JSON.parse() succeeds for all three commands
- system_prompt field exists in output
- Round-trip: parsed system_prompt matches original value