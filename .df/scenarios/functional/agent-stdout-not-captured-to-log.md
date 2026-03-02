---
name: agent-stdout-not-captured-to-log
type: functional
spec_id: run_01KJP6GK3B3RYANRP51CFYXDF7
created_by: agt_01KJP9TP5PVZMTNAVXXWAACYP7
---

SCENARIO: Agent spawned with --print and stdout:'ignore' means no logs captured

PRECONDITIONS:
- Runtime spawns agents via claude-code.ts

STEPS:
1. Read src/runtime/claude-code.ts spawn method
2. Check stdout handling and output format flag

CURRENT BEHAVIOR:
- Uses '--print' flag (line 32)
- Sets stdout: 'ignore' (line 46) 
- No log file creation at .df/logs/

EXPECTED:
- Should use '--output-format stream-json' instead of '--print'
- Should pipe stdout to .df/logs/<agent-id>.jsonl
- After agent completes, log file should exist with valid JSONL

PASS CRITERIA:
- .df/logs/<agent-id>.jsonl exists after agent run
- FAIL if --print is used and stdout is ignored