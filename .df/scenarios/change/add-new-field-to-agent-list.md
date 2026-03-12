---
name: add-new-field-to-agent-list
type: change
spec_id: run_01KKFJP2B248H395WES5SRNHWM
created_by: agt_01KKFJP2B477G0FJ56QPN8P0HA
---

Changeability test: Adding a new agent metric to agent list should only require changes to the query and format string.

MODIFICATION DESCRIPTION:
Add a hypothetical 'memory_usage_mb' field to the agent list output.

EXPECTED EFFORT:
1. Add field to AgentRecord type in src/types/agent.ts (1 line)
2. Add column to schema in src/db/schema.ts (1 line)
3. Add the field to formatAgentListEntry in src/utils/format-agent-list.ts (2-3 lines: read from agent record, format, add to parts array)
4. Optionally add to formatAgentDetail in src/utils/format-agent-detail.ts (1 line)

AFFECTED AREAS:
- src/types/agent.ts (type definition)
- src/db/schema.ts (DB column)
- src/utils/format-agent-list.ts (list format)
- src/utils/format-agent-detail.ts (detail format)

NO STRUCTURAL CHANGES should be needed in:
- src/commands/agent/list.ts (command wiring)
- src/commands/agent/show.ts (command wiring)
- src/db/queries/agent-queries.ts (queries use SELECT * so new columns auto-included)
- src/commands/status.ts (status command)

PASS CRITERIA:
- Total changes: 4-6 lines across 2-4 files
- No changes to command files (list.ts, show.ts)
- No changes to query files (SELECT * pattern means DB queries auto-include new columns)
- The formatAgentListEntry function has a clear pattern: read field, format, push to parts array
- Architecture supports extension by addition, not modification of structure