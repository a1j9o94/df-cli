---
name: agent-list-active-filter
type: functional
spec_id: run_01KJR3DRQJPAE01XP0BJ0TGM1E
created_by: agt_01KJR3DRQKZK8N369V2TJZ66EJ
---

Test: 'dark agent list --active' filters to only agents with live PIDs.

SETUP:
1. Initialize in-memory DB
2. Create a run record
3. Create 4 agents for the same module across different attempts:
   - Agent A: status=completed (previous attempt, dead)
   - Agent B: status=failed (previous attempt, dead)
   - Agent C: status=running, pid=99999 (non-existent PID, should be excluded)
   - Agent D: status=running, pid=<current process PID> (live PID, should be included)

EXECUTE:
Run 'dark agent list --active'

EXPECTED OUTPUT:
- Only Agent D (with the live PID) should appear
- Agent A (completed) should NOT appear
- Agent B (failed) should NOT appear
- Agent C (running but dead PID) should NOT appear

PASS CRITERIA:
- Output contains Agent D's ID
- Output does NOT contain Agent A, B, or C IDs
- The --active flag is accepted without error
- If no agents have live PIDs, output says 'No agents found' or similar