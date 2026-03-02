---
name: agent-list-json-valid
type: functional
spec_id: run_01KJQEP7BHVFD7GS7YYJDWFWJH
created_by: agt_01KJQEP7BJ05Z2KCGS05N3R3ZW
---

## Test: Agent list JSON is valid

### Preconditions
- Dark Factory project initialized with state.db
- At least 2 agents exist in the database, one with a system_prompt containing:
  - Literal newline characters (multi-line prompt)
  - Tab characters
  - Backslash sequences
  - Unicode characters
  - Single and double quotes

### Steps
1. Run: dark agent list --json
2. Pipe output to: python3 -c "import sys,json; data=json.load(sys.stdin); print('valid:', len(data))"
3. Pipe output to: echo '<output>' | jq .
4. In Node.js: JSON.parse(output) must succeed

### Expected Output
- Step 2: python3 exits 0, prints valid count
- Step 3: jq exits 0, pretty-prints the array
- Step 4: JSON.parse returns a valid array of agent objects

### Pass/Fail Criteria
- PASS: All three parsers accept the JSON output without errors
- FAIL: Any parser throws a parse error