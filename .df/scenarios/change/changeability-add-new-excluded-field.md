---
name: changeability-add-new-excluded-field
type: change
spec_id: run_01KK6XEX73VFTR66TYX35KP469
created_by: agt_01KK6XEX74FRYJEDHG0GSWNB2C
---

CHANGE SCENARIO: Add a new field to the exclusion list (e.g., exclude 'error' field from default JSON output)

MODIFICATION:
- Add 'error' to AGENT_EXCLUDED_FIELDS in agent/list.ts, agent/show.ts, and STATUS_EXCLUDED_FIELDS in status.ts
- Verify --verbose still includes the 'error' field

AFFECTED AREAS:
- src/commands/agent/list.ts (AGENT_EXCLUDED_FIELDS constant)
- src/commands/agent/show.ts (AGENT_DETAIL_EXCLUDED_FIELDS constant)
- src/commands/status.ts (STATUS_EXCLUDED_FIELDS constant)
- No changes needed in format.ts (generic field exclusion mechanism)

EXPECTED EFFORT: ~5 minutes, 3 constant changes
EXPECTED RISK: Low - adding to array, no logic changes

VERIFICATION:
- Run dark agent list --json, confirm 'error' field absent
- Run dark agent list --json --verbose, confirm 'error' field present
- Existing tests should still pass (they test system_prompt exclusion specifically)