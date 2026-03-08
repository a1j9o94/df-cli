---
name: defaults-highlighted
type: functional
spec_id: run_01KK7R4Y00QTYW313JFYCM7YTJ
created_by: agt_01KK7R4Y02HV5WA517GHC8FYHE
---

PRECONDITION: Fresh project with .df/config.yaml containing only defaults (or no config.yaml at all, relying on DEFAULT_CONFIG). STEPS: 1. Open Settings tab. 2. Verify ALL fields are shown as 'default' / grayed out (visual distinction from overridden fields). 3. Change one field: set max_parallel from 4 to 8. 4. Verify the max_parallel field now appears highlighted/non-grayed (visually distinct as 'overridden'). 5. Verify all other fields remain grayed/default. 6. Save config. 7. Reload Settings tab. 8. Verify max_parallel is still highlighted as overridden, all others still default. PASS CRITERIA: Clear visual distinction between default values and user-overridden values. Changed fields stand out visually.