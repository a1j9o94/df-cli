---
name: default-config-works
type: functional
spec_id: run_01KJSS4T9P8HBVBAJEFGWG8ZFR
created_by: agt_01KJSS4T9S94DSTBKCA1MND95P
---

Scenario: Default config works — no cost section in config.yaml, engine uses Sonnet defaults.

SETUP:
1. Ensure .df/config.yaml exists but has NO 'cost' section (only project/build/runtime/thresholds/resources).
2. Import getConfig from src/utils/config.ts.
3. Import getCostPerMinute, getTokensPerMinute from the cost module.

TEST STEPS:
1. Call getConfig() and inspect the returned DfConfig.
2. Verify config.cost exists with these exact defaults:
   - model: 'sonnet'
   - input_cost_per_mtok: 3.00
   - output_cost_per_mtok: 15.00
   - cache_read_cost_per_mtok: 0.30
   - cost_per_minute: 0.05
   - tokens_per_minute: 4000
   - roles: undefined or empty object
3. Call getCostPerMinute(config.cost, 'builder') — should return 0.05 (the default).
4. Call getTokensPerMinute(config.cost, 'builder') — should return 4000.
5. Simulate estimateCostIfMissing behavior: an agent with 10 minutes elapsed should produce:
   - estimatedCost = max(0.01, 10 * 0.05) = 0.50
   - estimatedTokens = round(10 * 4000) = 40000

PASS CRITERIA:
- All default values match exactly.
- getCostPerMinute with no role override returns the base default.
- Cost estimation produces identical results to the old hardcoded heuristic (0.05/min, 4000 tokens/min).