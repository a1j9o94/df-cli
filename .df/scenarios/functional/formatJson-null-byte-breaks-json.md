---
name: formatJson-null-byte-breaks-json
type: functional
spec_id: run_01KJP6GK3B3RYANRP51CFYXDF7
created_by: agt_01KJP9TP5PVZMTNAVXXWAACYP7
---

SCENARIO: formatJson() with null bytes in system_prompt may produce problematic JSON

PRECONDITIONS:
- An agent exists with system_prompt containing literal null byte (\x00)

STEPS:
1. Insert agent with system_prompt containing \x00
2. Run: dark agent list --json
3. Pipe to: python3 -c 'import sys,json; json.load(sys.stdin)'
4. Pipe to: jq .

EXPECTED:
- All parsers accept the output
- JSON.stringify converts \x00 to \u0000

PASS CRITERIA:
- Valid JSON output from all parsers
- FAIL if any parser rejects the output