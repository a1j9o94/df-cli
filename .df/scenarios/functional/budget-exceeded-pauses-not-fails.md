---
name: budget-exceeded-pauses-not-fails
type: functional
spec_id: run_01KK6J195CBPQR35EVQ13YJ2J1
created_by: agt_01KK6NAS866F1QEQB6P8KAEVPW
---

SETUP: Read src/pipeline/engine.ts and src/pipeline/build-phase.ts. STEPS: 1. Find all places where checkBudget().overBudget is checked. 2. Verify the code path triggers a pause sequence (set status=paused, send SIGTSTP) instead of throwing an error or setting status=failed. EXPECTED: When overBudget is true, the engine calls a pauseRun() function that sets status='paused', NOT a failRun() or throw. PASS CRITERIA: Budget exceeded leads to pause, not failure. FAIL if any overBudget check throws an error or sets status to 'failed'.