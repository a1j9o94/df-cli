---
name: all-json-commands-valid
type: functional
spec_id: run_01KK6XEX73VFTR66TYX35KP469
created_by: agt_01KK6XEX74FRYJEDHG0GSWNB2C
---

SCENARIO: Every --json command in the CLI produces valid, parseable JSON

SETUP:
1. Initialize a project with at least one run, agents, specs, and scenarios

STEPS:
1. Run each of the following commands and pipe output to a JSON validator:
   a. dark agent list --json
   b. dark agent show <id> --json
   c. dark status --json
   d. dark spec list --json
   e. dark scenario list --json
   f. dark run list --json (if implemented)
   g. dark research list --json (if implemented)
   h. dark contract list --json (if implemented)
2. For each command: echo output | python3 -c 'import sys,json; json.load(sys.stdin)'
3. For each command: echo output | jq .

EXPECTED:
- Every single --json command produces output that passes both JSON.parse() and python json.loads()
- No command produces output with unescaped control characters
- Empty results should produce valid JSON (empty array [] or object with empty array)

PASS CRITERIA:
- 0 failures across all --json commands
- python3 json.loads exits 0 for each
- jq exits 0 for each