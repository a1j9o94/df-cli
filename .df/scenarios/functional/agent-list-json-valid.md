---
name: agent-list-json-valid
type: functional
spec_id: run_01KK6XEX73VFTR66TYX35KP469
created_by: agt_01KK6XEX74FRYJEDHG0GSWNB2C
---

SCENARIO: agent list --json produces valid JSON with control characters in system_prompt

SETUP:
1. Initialize a dark factory project (df init or use existing .df directory)
2. Create a run with a spec
3. Create an agent with a system_prompt containing: newlines (\n), tabs (\t), null bytes (\x00), and all control characters 0x00-0x1F

STEPS:
1. Run: dark agent list --json
2. Capture stdout to a variable/file
3. Parse with JSON.parse() in Node/Bun - must NOT throw
4. Parse with: echo '<output>' | python3 -c 'import sys,json; json.load(sys.stdin)' - must exit 0
5. Parse with: echo '<output>' | jq . - must exit 0

EXPECTED:
- All three parsers succeed without error
- Output is a JSON array of agent objects
- Each agent object has fields: id, run_id, role, name, status, etc.
- system_prompt field is NOT present in any agent object (excluded by default)

PASS CRITERIA:
- JSON.parse() succeeds
- Python json.loads() succeeds
- jq exits 0
- No system_prompt field in output