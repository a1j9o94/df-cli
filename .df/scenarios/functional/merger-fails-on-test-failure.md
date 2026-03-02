---
name: merger-fails-on-test-failure
type: functional
spec_id: run_01KJQ3REAY3PPJ95V0NGGPB8WZ
created_by: agt_01KJQ3REAZSCFRXXN0X7HMFP16
---

## Test: Merger fails on test failure

### Preconditions
- A Dark Factory project with a test command configured (e.g., `bun test` in package.json)
- A merger agent exists in the DB with role='merger' and status='running'
- The project has at least one test file that is currently FAILING (exit code != 0)

### Steps
1. Set up a project where `bun test` (or the configured test command) fails with exit code 1
2. Run `dark agent complete <merger-agent-id>`
3. Capture the exit code and stderr/stdout output

### Expected Output
- Step 2: Command exits with non-zero exit code
- Step 2: Error message clearly states that tests failed
- Step 2: Error message includes which test command was run and its output/exit code
- The merger agent status in the DB remains 'running' (NOT 'completed')

### Pass Criteria
- `dark agent complete` rejects when tests fail
- Error message mentions test failure specifically (not a generic error)
- Merger agent is NOT marked as completed in the database