---
name: add-new-agent-field
type: change
spec_id: run_01KJQERB5P8DCWZJXCZR5Z64BW
created_by: agt_01KJQERB5RN11QM94PWHDCE5WH
---

CHANGEABILITY SCENARIO: Adding a new agent metric (e.g., 'memory_usage_mb') to the agent list output.

MODIFICATION DESCRIPTION:
Add a new field 'memory_usage_mb' that shows peak memory usage of each agent process. This field should appear in 'dark agent list' output and 'dark agent show' detail.

EXPECTED CHANGES:
1. src/db/queries/agents.ts — Add query to read the new field (if stored in DB) or compute it
2. src/commands/agent/list.ts — Add the field to the output format string (one line change in the display loop)
3. src/commands/agent/show.ts — Add the field to the detail view (one line)
4. Optionally: src/types/agent.ts — Add field to AgentRecord interface (if persisted)

EXPECTED EFFORT: 
- 2-4 files modified
- ~5-10 lines of code total
- No structural changes to command parsing, query patterns, or formatting logic
- The formatting pipeline (query → format → display) should make this a straightforward addition

PASS CRITERIA:
- Adding a new display field requires ONLY: adding it to the query/record, adding a format call, adding to the output template
- No changes needed to command option parsing, argument handling, or formatter architecture
- The pattern is clear from reading existing code — a developer can follow the existing field additions as a template

FAIL CRITERIA:
- Adding a field requires restructuring the display logic
- Format helpers need architectural changes to support new data types
- Query layer needs new patterns beyond SELECT column additions