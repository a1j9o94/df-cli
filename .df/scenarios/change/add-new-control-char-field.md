---
name: add-new-control-char-field
type: change
spec_id: run_01KJP6GSHWMZED4PZV683YAQNR
created_by: agt_01KJP6GSHX4V399DJ40R87K3YJ
---

## Changeability: Add New Field with Control Characters

### Modification Description
A developer adds a new TEXT column 'agent_notes' to the agents table that can contain arbitrary multiline text with control characters (newlines, tabs, special chars). This tests whether the JSON sanitization fix is robust and doesn't require per-field hardcoding.

### Steps to Verify
1. Add 'agent_notes TEXT' column to agents table in schema.ts
2. Add 'agent_notes' to AgentRecord type
3. Insert an agent with agent_notes containing control characters: 'Note line 1\nNote line 2\tTabbed\x00Null'
4. Run dark agent list --json

### Expected Effort
- The new field should be automatically sanitized by the formatJson() utility without any additional code changes
- If system_prompt exclusion is field-name-based, agent_notes should appear in default output (it's not in the exclusion list)
- The JSON output should be valid even with the new field containing control chars

### Affected Areas
- src/db/schema.ts (column addition)
- src/types/agent.ts (type addition)
- src/utils/format.ts (should handle automatically via sanitization)
- No changes needed to format.ts if sanitization is properly generic

### Pass/Fail Criteria
- PASS: Adding a new TEXT field with control chars produces valid JSON without touching format.ts
- FAIL: Adding a new field requires changes to the serialization logic to avoid invalid JSON