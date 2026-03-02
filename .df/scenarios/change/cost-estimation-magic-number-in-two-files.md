---
name: cost-estimation-magic-number-in-two-files
type: change
spec_id: run_01KJQ3REAY3PPJ95V0NGGPB8WZ
created_by: agt_01KJQGS6G0HH1CJ1PKMW5KN4P7
---

CHANGEABILITY SCENARIO: The cost estimation formula uses magic number 0.05 (dollars per minute) inline in TWO separate files: build-phase.ts line 96 and agent-lifecycle.ts line 73. Both contain identical Math.max(0.01, elapsedMin * 0.05) and Math.round(elapsedMin * 4000). Changing the cost rate requires editing BOTH files AND understanding the token heuristic (4000 tokens/min). A single COST_PER_MINUTE constant exported from budget.ts would eliminate the duplication. VERIFICATION: grep -n '0.05' src/pipeline/build-phase.ts src/pipeline/agent-lifecycle.ts — both show inline 0.05. grep 'COST_PER_MINUTE\|COST_RATE' src/ — returns nothing. PASS CRITERIA: PASS if cost rate is defined as a named constant in exactly ONE file and imported by all consumers. FAIL (expected) if the rate appears as a magic number in 2+ files.