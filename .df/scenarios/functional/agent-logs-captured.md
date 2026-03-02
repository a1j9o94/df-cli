---
name: agent-logs-captured
type: functional
spec_id: run_01KJP8WZ5DKH52F4S0SWCGKJWW
created_by: agt_01KJP8WZ5FJ90GR22QSDS2FYR3
---

## Scenario: Agent logs captured in stream-json format

### Preconditions
- The .df/logs/ directory exists (or is created automatically)
- A builder agent is spawned and runs to completion

### Test Steps
1. Check that src/runtime/claude-code.ts spawn method uses '--output-format stream-json' instead of '--print'
2. Verify stdout is captured to a file at .df/logs/<agent-id>.jsonl
3. Spawn a builder agent and wait for it to complete
4. Check that .df/logs/<agent-id>.jsonl exists
5. Read the file and verify it contains valid JSONL (one JSON object per line)
6. Verify the log contains tool calls, token usage data, and the last action before completion

### Expected Output
- claude-code.ts spawn method passes '--output-format stream-json' as an argument
- The stdout of the process is piped to a file at .df/logs/<agent-id>.jsonl
- After agent completes, the .jsonl file exists and is non-empty
- Each line of the file is valid JSON
- The file contains entries showing what the agent was doing (tool calls, messages)
- Token usage information is present in the log

### Pass/Fail Criteria
- PASS: .df/logs/<agent-id>.jsonl exists after agent run, contains valid JSONL with tool calls and token usage
- FAIL: No log file created, OR file is empty, OR file contains non-JSON content, OR '--print' is still used instead of '--output-format stream-json'