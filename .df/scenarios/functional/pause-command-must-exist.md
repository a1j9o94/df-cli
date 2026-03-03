---
name: pause-command-must-exist
type: functional
spec_id: run_01KJSS7KPSXHDFWHRE2S286JK5
created_by: agt_01KJSW9NVMB0Y8KQZK63QQSPKS
---

SCENARIO: dark pause command must exist as a registered CLI command.
STEPS: 1. Check that src/commands/pause.ts exists. 2. Check that src/index.ts imports and registers pauseCommand. 3. Verify the command sends SIGTERM to running agents, waits 30s, then SIGKILL. 4. Verify it sets agent status to paused and run status to paused.
EXPECTED: pause.ts exists with a Commander command exported and registered in index.ts.
PASS CRITERIA: File exists, is imported in index.ts, handles graceful agent shutdown. FAIL if pause command does not exist.
