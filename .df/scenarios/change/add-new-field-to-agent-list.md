---
name: add-new-field-to-agent-list
type: change
spec_id: run_01KJSXZQ1WDY0A0JVRTZPNB3AW
created_by: agt_01KJSXZQ1X0E7M9WZA7R77WKY6
---

CHANGEABILITY SCENARIO: Adding a new agent metric (e.g., memory usage) to agent list output.

MODIFICATION DESCRIPTION:
Add a 'memory_usage' field to the agent list output, showing peak RSS in MB for each running agent.

EXPECTED CHANGE SCOPE:
1. Add 'memory_usage_mb' column to agents table in src/db/schema.ts (1 ALTER TABLE or migration)
2. Update AgentRecord type in src/types/agent.ts (add field)
3. Add memoryUsageMb to FormatAgentListOptions in src/utils/format-agent-list.ts (add to options interface + add format line, ~3-5 lines)
4. In src/commands/agent/list.ts, fetch memory metric and pass to formatAgentListEntry options (2-3 lines)

AREAS NOT AFFECTED:
- No changes to agent-queries.ts (SELECT * already gets all columns)
- No changes to agent show command (format-agent-detail uses agent record directly)
- No changes to status command
- No structural changes to formatting architecture

EXPECTED EFFORT:
- 4 files touched, each with a small (<10 line) change.
- No new interfaces, no new query functions, no command restructuring.
- Total effort: <30 minutes for a developer familiar with the codebase.

PASS CRITERIA:
- Only files in the expected scope need changes.
- Changes are additive (adding a line/field), not structural (reorganizing code).
- The format-agent-list.ts options pattern makes adding new enrichment data trivial.
- No test file changes needed (the new field is optional in the interface).