---
name: role-specific-override
type: functional
spec_id: run_01KJSS4T9P8HBVBAJEFGWG8ZFR
created_by: agt_01KJSS4T9S94DSTBKCA1MND95P
---

Scenario: Role-specific override — builder gets custom rate, architect uses default.

SETUP:
1. Write a .df/config.yaml with:
   cost:
     cost_per_minute: 0.05
     tokens_per_minute: 4000
     roles:
       builder:
         cost_per_minute: 0.10
   (No override for architect.)
2. Import getConfig, getCostPerMinute, getTokensPerMinute.

TEST STEPS:
1. Load config via getConfig().
2. Verify config.cost.roles.builder.cost_per_minute === 0.10.
3. Call getCostPerMinute(config.cost, 'builder') — should return 0.10 (role override).
4. Call getCostPerMinute(config.cost, 'architect') — should return 0.05 (default, no role override).
5. Call getCostPerMinute(config.cost, 'evaluator') — should return 0.05 (default, no role override).
6. Call getTokensPerMinute(config.cost, 'builder') — should return 4000 (no tokens_per_minute override in role).
7. If roles.builder also specifies tokens_per_minute: 8000, then getTokensPerMinute(config.cost, 'builder') should return 8000.
8. Simulate estimateCostIfMissing for a builder agent (10 min):
   - Expected: max(0.01, 10 * 0.10) = 1.00
9. Simulate estimateCostIfMissing for an architect agent (10 min):
   - Expected: max(0.01, 10 * 0.05) = 0.50

PASS CRITERIA:
- Builder uses role-specific rate (0.10).
- Architect falls through to default rate (0.05).
- Role overrides are additive — only the fields specified in the role section override; others use defaults.
- estimateCostIfMissing correctly uses role-specific rates when the agent has a known role.