---
name: agent-logs-captured
type: functional
spec_id: run_01KJQ3RPWCVM02YZ86GB23AHTX
created_by: agt_01KJQ3RPWEX5P5Z3N2EG0ASHGW
---

## Scenario: Agent logs captured in structured format

### Preconditions
- A builder agent is spawned for any module
- The .df/logs/ directory exists (or is created automatically)

### Test Steps
1. Run a builder agent to completion (or failure)
2. Check for a log file at .df/logs/<agent-id>.jsonl
3. Parse the JSONL file and inspect its contents

### Expected Results
- A file exists at .df/logs/<agent-id>.jsonl after the builder runs
- The file contains valid JSONL (one JSON object per line)
- The JSON objects include structured data from claude --output-format stream-json, such as:
  - Token usage per turn
  - Tool calls made by the agent
  - Cost information (actual, not estimated)
  - The last tool call before completion or crash
- The claude --print invocation in claude-code.ts uses --output-format stream-json
- The output stream is piped/captured to the .df/logs/<agent-id>.jsonl file
- Logs are write-only during the run (no reading during execution)

### Pass/Fail Criteria
- PASS: .df/logs/<agent-id>.jsonl exists, contains valid JSONL with token usage and tool calls
- FAIL: No log file created, or claude --print does not use --output-format stream-json