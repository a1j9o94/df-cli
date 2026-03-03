---
name: custom-cost-per-minute
type: functional
spec_id: run_01KJSS4T9P8HBVBAJEFGWG8ZFR
created_by: agt_01KJSS4T9S94DSTBKCA1MND95P
---

Scenario: Custom cost_per_minute — set cost.cost_per_minute to 0.20, verify 4x higher estimates.

SETUP:
1. Write a .df/config.yaml with:
   cost:
     cost_per_minute: 0.20
   (All other cost fields use defaults.)
2. Import getConfig, getCostPerMinute, and the estimateCostIfMissing function.

TEST STEPS:
1. Load config via getConfig(). Verify config.cost.cost_per_minute === 0.20.
2. Verify other defaults are preserved: input_cost_per_mtok === 3.00, output_cost_per_mtok === 15.00, tokens_per_minute === 4000.
3. Call getCostPerMinute(config.cost, 'architect') — should return 0.20.
4. Call getCostPerMinute(config.cost, 'builder') — should return 0.20 (no role override).
5. Simulate estimateCostIfMissing with 10 minutes elapsed:
   - Expected cost = max(0.01, 10 * 0.20) = 2.00
   - This is 4x the default (0.50 for 10 min at 0.05/min).
6. Simulate with 1 minute elapsed:
   - Expected cost = max(0.01, 1 * 0.20) = 0.20 (vs default 0.05).

PASS CRITERIA:
- cost_per_minute is correctly read from config.
- All non-overridden defaults are preserved.
- estimateCostIfMissing produces costs 4x higher than the default rate.
- The floor of 0.01 still applies for very short durations.