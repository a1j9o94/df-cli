---
name: profile-shorthand
type: functional
spec_id: run_01KJSS4T9P8HBVBAJEFGWG8ZFR
created_by: agt_01KJSS4T9S94DSTBKCA1MND95P
---

Scenario: Profile shorthand — set cost.profile to 'opus', verify all pricing resolves to Opus rates. Override one field and verify precedence.

SETUP:
1. Write a .df/config.yaml with:
   cost:
     profile: 'opus'

TEST STEPS — Part A (profile only):
1. Load config via getConfig().
2. Call resolveCostProfile('opus') and verify it returns:
   - model: 'opus'
   - input_cost_per_mtok: 15.00
   - output_cost_per_mtok: 75.00
   - cache_read_cost_per_mtok: 1.50
   - cost_per_minute: (some Opus-appropriate default, e.g., 0.15 or similar — verify spec)
   - tokens_per_minute: (some Opus-appropriate default)
3. Verify config.cost resolves all fields to Opus rates.
4. Verify resolveCostProfile('sonnet') returns: input_cost_per_mtok: 3.00, output_cost_per_mtok: 15.00.
5. Verify resolveCostProfile('haiku') returns: input_cost_per_mtok: 0.25, output_cost_per_mtok: 1.25.

TEST STEPS — Part B (profile with explicit override):
1. Write config.yaml with:
   cost:
     profile: 'opus'
     cost_per_minute: 0.20
2. Load config. Verify:
   - input_cost_per_mtok: 15.00 (from opus profile)
   - output_cost_per_mtok: 75.00 (from opus profile)
   - cost_per_minute: 0.20 (explicitly overridden, takes precedence over profile default)
3. Call getCostPerMinute(config.cost, 'builder') — should return 0.20 (the explicit override).

TEST STEPS — Part C (unknown profile):
1. Set cost.profile: 'unknown_model'.
2. Verify behavior: should either fall back to defaults or raise an error. Verify whichever behavior is implemented is consistent.

PASS CRITERIA:
- Profile 'opus' correctly sets all pricing fields.
- Profile 'sonnet' and 'haiku' also resolve correctly.
- Explicit field overrides take precedence over profile defaults.
- All three profile presets (sonnet, opus, haiku) are available.
- 'custom' profile (or no profile with explicit fields) works correctly.