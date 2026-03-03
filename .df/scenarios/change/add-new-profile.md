---
name: add-new-profile
type: change
spec_id: run_01KJSS4T9P8HBVBAJEFGWG8ZFR
created_by: agt_01KJSS4T9S94DSTBKCA1MND95P
---

Changeability Scenario: Add a new 'gpt-4o' profile — should require only adding an entry to the profiles map.

MODIFICATION:
Add a 'gpt-4o' profile with pricing: input_cost_per_mtok: 2.50, output_cost_per_mtok: 10.00, cache_read_cost_per_mtok: 1.25, cost_per_minute: 0.04, tokens_per_minute: 5000.

EXPECTED EFFORT:
1. Locate the profiles map/constant (should be a single file, e.g., src/pipeline/cost.ts or src/utils/cost.ts).
2. Add one entry to the map: { model: 'gpt-4o', input_cost_per_mtok: 2.50, output_cost_per_mtok: 10.00, cache_read_cost_per_mtok: 1.25, cost_per_minute: 0.04, tokens_per_minute: 5000 }.
3. No other files should need modification.

AFFECTED AREAS:
- Only the profiles map definition file.
- No changes to config.ts types, no changes to engine.ts, no changes to status.ts.
- The profile type union (if any) may need 'gpt-4o' added, but this should be in the same file or adjacent.

PASS CRITERIA:
- Adding the profile requires changes to exactly 1 file (max 2 if type union is separate).
- Total lines changed: <=10.
- After adding, config.yaml with 'cost.profile: gpt-4o' resolves all fields correctly.
- No test changes needed (tests should be parameterized or the new profile is naturally exercised).