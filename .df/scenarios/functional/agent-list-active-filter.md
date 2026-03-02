---
name: agent-list-active-filter
type: functional
spec_id: run_01KJQERB5P8DCWZJXCZR5Z64BW
created_by: agt_01KJQERB5RN11QM94PWHDCE5WH
---

SCENARIO: 'dark agent list --active' filters to only agents with live PIDs.

SETUP:
1. Initialize dark factory project
2. Run a build that has completed (has dead agents from previous run)
3. Start a new build (resume) so there are both active and dead agents in the DB
4. Ensure at least 2 agents are in 'completed' or 'failed' or 'killed' status AND at least 1 agent is in 'running' status

TEST STEPS:
1. Run 'dark agent list' (no filter) — count total agents
2. Run 'dark agent list --active' — count filtered agents
3. Run 'dark agent list --json' and 'dark agent list --active --json' for machine-readable comparison

PASS CRITERIA:
- 'dark agent list --active' shows FEWER agents than unfiltered list (dead agents excluded)
- Every agent shown by --active has status in ('pending', 'spawning', 'running')
- No agent shown by --active has status 'completed', 'failed', or 'killed'
- --active flag works in combination with --run-id and --role filters
- --active flag works with --json output mode

FAIL CRITERIA:
- --active shows same count as unfiltered (dead agents not excluded)
- --active shows agents with terminal status (completed/failed/killed)
- --active flag is not recognized by the CLI