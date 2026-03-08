---
name: swarm-budget-limit
type: functional
spec_id: run_01KK7R4Y6S9X8AQA0BPDTRZ039
created_by: agt_01KK7R4Y6VS8TXZ8FQ3TWGRQTG
---

PRECONDITION: Three specs A, B, C exist, all draft, no dependencies (all ready to build).

STEPS:
1. Run: dark swarm --budget-usd 5 --parallel 1

EXPECTED:
- Swarm starts building specs one at a time
- After cumulative cost across ALL runs exceeds $5, swarm stops
- Remaining unbuilt specs stay in draft/ready status
- A message indicates budget was exhausted
- The swarm does NOT start new builds after budget is exceeded
- Any currently-running build may complete (graceful)

VERIFICATION:
- Check runs table: total cost_usd across all runs created by this swarm <= budget + cost of final run
- Check specs table: at least one spec remains in draft/ready status (assuming each build costs >.67)

PASS/FAIL:
- PASS if swarm stops when budget is exhausted and reports it
- FAIL if swarm continues building after budget exceeded, or crashes