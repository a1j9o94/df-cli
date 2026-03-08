---
name: agent-field-exclusion-is-centralized
type: change
spec_id: run_01KK74N40R4GGRR0DNE5AA8G2A
created_by: agt_01KK77KMRRRHNXJW1T7AHKMGEP
---

Verify AGENT_DEFAULT_EXCLUDED_FIELDS is a single centralized constant in src/utils/format.ts used by list.ts, show.ts, and status.ts. Adding a new excluded field requires changing only 1 file (format.ts). PASS: All 3 commands import from format.ts, no per-command exclusion lists. FAIL: Separate exclusion lists per command.