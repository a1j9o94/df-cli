---
name: agent-expanded-shows-pid-and-worktree
type: functional
spec_id: run_01KJT1DSECDSZP9V2JPPS48CRC
created_by: agt_01KJT41Z883KW29HZKC65GKRCB
---

SCENARIO: Expanded agent details show PID and worktree path. PRECONDITIONS: Run has agents with valid PIDs and worktree paths. Dashboard server running. TEST STEPS: 1. Expand the collapsible agents section on the Overview tab. 2. Verify each agent card renders the agent PID value. 3. Verify each agent card renders the worktree path (if present). 4. These fields are available in AgentSummary (pid: number|null, worktreePath from agent record). EXPECTED: Expanded agent cards show PID and worktree path alongside cost, tokens, elapsed. PASS CRITERIA: Agent card HTML includes PID value and worktree path when agent section is expanded.