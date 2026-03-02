---
name: add-new-agent-field
type: change
spec_id: run_01KJR3DRQJPAE01XP0BJ0TGM1E
created_by: agt_01KJR3DRQKZK8N369V2TJZ66EJ
---

Changeability test: Adding a new agent metric (e.g., 'memory_usage') to the agent list output.

MODIFICATION:
Add a new field 'memory_usage' (or any hypothetical metric) to the agent list display.

EXPECTED EFFORT:
1. Add the field to the agent query (db/queries/agents.ts or the AgentRecord type) — 1 line
2. Add the field to the format string in the list command (commands/agent/list.ts) — 1-2 lines
3. Optionally add to agent show command (commands/agent/show.ts) — 1-2 lines

STRUCTURAL CHANGES REQUIRED: None. No new files, no new modules, no refactoring.

AFFECTED AREAS:
- src/types/agent.ts (add field to AgentRecord interface)
- src/commands/agent/list.ts (add field to display format)
- src/commands/agent/show.ts (add field to detail view)
- DB schema (ALTER TABLE or schema migration)

PASS CRITERIA:
- The change requires modifying at most 3-4 files
- No changes to format.ts or status.ts are needed
- The list format is data-driven enough that adding a field is a 1-line addition to the format template
- Total LOC change: < 10 lines