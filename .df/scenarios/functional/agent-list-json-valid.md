---
name: agent-list-json-valid
type: functional
spec_id: run_01KJP6GSHWMZED4PZV683YAQNR
created_by: agt_01KJP6GSHX4V399DJ40R87K3YJ
---

## Agent List JSON Validity Test

### Preconditions
- A Dark Factory project is initialized (dark init)
- At least one agent exists with a system_prompt containing:
  - Literal newlines (\n)
  - Literal tabs (\t)
  - Carriage returns (\r)
  - Null bytes (\x00)
  - Other control chars (\x01-\x1f)
  - Template string backticks and interpolation markers
  - Mixed UTF-8 characters

### Setup Steps
1. Create a test agent via the DB with system_prompt containing ALL of the above control characters:
   INSERT INTO agents (id, run_id, role, name, status, system_prompt, created_at, updated_at)
   VALUES ('test-agent', 'test-run', 'builder', 'test-builder', 'running',
   'Line 1\nLine 2\tTabbed\rCarriage\x00Null\x01Control', datetime('now'), datetime('now'));
2. The run must also exist in the runs table for the agent to reference.

### Test Execution
Run: dark agent list --json | python3 -c "import sys,json; json.load(sys.stdin)"

### Expected Output
- Exit code 0 (no parse error)
- The JSON is valid and parseable by Python json.loads()

### Additional Validation
- Pipe to jq: dark agent list --json | jq .
- Exit code 0
- Parse with Node: dark agent list --json | node -e "process.stdin.resume(); let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{JSON.parse(d);console.log('OK')})"
- All three parsers must succeed

### Pass/Fail Criteria
- PASS: All three parsers (Python, jq, Node) accept the output as valid JSON
- FAIL: Any parser rejects the output