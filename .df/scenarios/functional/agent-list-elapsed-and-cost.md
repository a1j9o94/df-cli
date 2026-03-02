---
name: agent-list-elapsed-and-cost
type: functional
spec_id: run_01KJR3DRQJPAE01XP0BJ0TGM1E
created_by: agt_01KJR3DRQKZK8N369V2TJZ66EJ
---

Test: Agent list shows elapsed time and estimated cost for running agents.

SETUP:
1. Initialize in-memory DB with schema
2. Create a run record (run_01TEST) with spec_id=spec_01TEST
3. Create an agent record with role=builder, status=running, created_at=12 minutes ago, cost_usd=0.62
4. Set agent PID to a valid PID (e.g., process.pid)

EXECUTE:
Run the agent list command output formatter (or invoke 'dark agent list' CLI)

EXPECTED OUTPUT:
- Each running agent line MUST contain elapsed time in human-readable format (e.g., '12m 34s' or '12m')
- Each running agent line MUST contain estimated cost prefixed with ~ dollar sign (e.g., '~$0.62')
- Completed/failed agents should show final elapsed and cost (not live-computed)

PASS CRITERIA:
- Output contains a time duration string matching pattern like /\d+m\s*\d*s?/ or /\d+h\s*\d+m/
- Output contains a cost string matching pattern like /~?\$\d+\.\d{2}/
- Both elapsed and cost appear on the SAME line as the agent ID