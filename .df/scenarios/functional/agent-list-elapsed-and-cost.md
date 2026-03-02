---
name: agent-list-elapsed-and-cost
type: functional
spec_id: run_01KJQERB5P8DCWZJXCZR5Z64BW
created_by: agt_01KJQERB5RN11QM94PWHDCE5WH
---

SCENARIO: Agent list shows elapsed time and estimated cost for running agents.

SETUP:
1. Initialize a dark factory project with 'dark init'
2. Create a spec and start a build
3. Wait for at least one builder agent to be in 'running' status with a created_at timestamp at least 60 seconds old

TEST STEPS:
1. Run 'dark agent list'
2. Parse the output for each running agent line

EXPECTED OUTPUT FORMAT:
Each running agent line should match pattern:
  agt_XXXXX  <name> (<role>)  running  <elapsed>  ~$<cost>  <N> files  module=<id>
    worktree: <path>
    last heartbeat: <relative-time>

PASS CRITERIA:
- Elapsed time is shown in human-readable format (e.g., '12m 34s', '1h 2m', '5s') — NOT raw seconds or ISO timestamps
- Estimated cost is shown with dollar sign and ~ prefix (e.g., '~$0.62')
- Cost value is > 0 for running agents (computed from elapsed or actual cost_usd)
- Both fields appear on the same line as agent ID, name, role, status
- Elapsed time increases on subsequent calls (not static)

FAIL CRITERIA:
- Elapsed time is missing or shows raw timestamp
- Cost is missing or shows 0 for an agent that has been running > 30 seconds
- Format doesn't match human-readable pattern