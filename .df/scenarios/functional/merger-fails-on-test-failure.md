---
name: merger-fails-on-test-failure
type: functional
spec_id: run_01KJP6FN10E981ZTJDAYHGHVXQ
created_by: agt_01KJP6FN18BEE7QPK06ETWXPQH
---

## Merger Fails on Test Failure

### Preconditions
- A Dark Factory project is initialized
- A run exists with a merger agent in running state
- The project has a test command configured (bun test)
- At least one test file exists that will FAIL (e.g., a test asserting false)

### Steps
1. Create a test file in the project that deliberately fails (e.g., expect(true).toBe(false))
2. Ensure the merger agent has created at least one commit on the target branch (satisfying the existing guard)
3. Run: dark agent complete <merger-agent-id>

### Expected Results
- The complete command exits with a non-zero exit code
- The error message includes which tests failed (test name or file name)
- The error message indicates tests must pass before completing
- The agent status remains 'running' (not changed to 'completed')

### Pass/Fail Criteria
- PASS: dark agent complete rejects with test failure details, agent stays running
- FAIL: dark agent complete succeeds despite failing tests, OR error message does not indicate which tests failed