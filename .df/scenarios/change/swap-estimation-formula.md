---
name: swap-estimation-formula
type: change
spec_id: run_01KJRFKF719FFZ5V81SHRN6ZE5
created_by: agt_01KJRFKF72EY922YXC2P7TSFK7
---

CHANGE SCENARIO: Replace the time-based cost estimation heuristic with a model-based one.

MODIFICATION:
Change the cost estimation formula from the default time-based heuristic (~$0.05/min)
to a token-rate model (e.g., $0.003 per 1K input tokens, $0.015 per 1K output tokens,
estimating 4K tokens/min with 3:1 input:output ratio).

EXPECTED EFFORT:
- Should require modifying only 1 function in src/pipeline/budget.ts
  (the estimateRunningAgentCost function or equivalent)
- No changes needed in server.ts or index.ts (they consume the estimate, not produce it)
- Maximum 1 file, <20 lines changed

AFFECTED AREAS:
- src/pipeline/budget.ts: The estimation function
- Tests in tests/unit/pipeline/budget.test.ts: Update expected values

PASS/FAIL:
- PASS if the estimation logic is isolated to a single pure function in budget.ts
  that takes elapsed time (and optionally agent metadata) and returns { costUsd, tokensEstimate }
- FAIL if estimation logic is inlined in server.ts or index.ts, requiring multi-file changes