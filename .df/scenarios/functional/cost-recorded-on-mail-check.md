---
name: cost-recorded-on-mail-check
type: functional
spec_id: run_01KJNF621NWJEZ5JT45BDR4JFB
created_by: agt_01KJNF621SCC96MJ883W7SCDBK
---

# Cost Recorded on Mail Check

## Preconditions
- A Dark Factory project is initialized with a run
- An agent exists in 'running' status

## Steps
1. Create/spawn an agent (record agent ID)
2. Record initial agent.cost_usd (should be 0 or baseline)
3. Wait at least 10 seconds
4. Call `dark mail check --agent <agent-id>`
5. Query agent.cost_usd from DB

## Expected Output
- Agent cost_usd after mail check > initial cost_usd
- The increment is proportional to elapsed time since agent creation (or last command)
- Run cost_usd also increases by the same delta

## Pass/Fail Criteria
- PASS: agent.cost_usd increases after a mail check command
- FAIL: agent.cost_usd remains unchanged after mail check

## Key Verification
This tests that non-agent commands (mail check) also trigger cost estimation. Currently mail/check.ts has NO cost recording. After the fix, it should call estimateAndRecordCost as a side effect. Also verify mail/send.ts, scenario/create, and contract/acknowledge all have the same behavior by checking their code paths include the estimateAndRecordCost call.