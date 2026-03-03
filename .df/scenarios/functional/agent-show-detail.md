---
name: agent-show-detail
type: functional
spec_id: run_01KJSXZQ1WDY0A0JVRTZPNB3AW
created_by: agt_01KJSXZQ1X0E7M9WZA7R77WKY6
---

SCENARIO: dark agent show <id> displays full agent detail with events and messages.

PRECONDITIONS:
- An agent exists in the DB with: id, name, role, status, pid, module_id, worktree_path, cost_usd > 0, tokens_used > 0, last_heartbeat set, created_at, updated_at.
- The agent has at least 2 events in the events table (e.g., agent-spawned, agent-heartbeat).
- The agent has at least 1 message in the messages table (to_agent_id = agent.id).

STEPS:
1. Run: dark agent show <agent_id>
2. Capture text output.
3. Run: dark agent show <agent_id> --json
4. Parse JSON output.

EXPECTED TEXT OUTPUT must contain ALL of these fields:
- 'Agent: <id>' header line
- 'Name:' with agent name
- 'Role:' with agent role
- 'Status:' with agent status
- 'PID:' with PID or 'none'
- 'Module:' with module_id or 'none'
- 'Worktree:' with path or 'none'
- 'Branch:' with branch or 'none'
- 'Elapsed:' with time string
- 'Heartbeat:' with relative time
- 'Cost:' with dollar amount
- 'Tokens:' with formatted number
- 'Events (N):' section with at least 2 entries
- 'Messages (N):' section with at least 1 entry showing from, read status, and truncated body

EXPECTED JSON OUTPUT:
- Has agent object with all AgentRecord fields
- Has events array with EventRecord objects
- Has messages array with MessageRecord objects

PASS CRITERIA:
- Text output contains all 12+ labeled fields listed above.
- Events section shows type and relative time for each event.
- Messages section shows from_agent_id, [unread] marker if unread, and message body (truncated to ~80 chars).
- --json output parses as valid JSON with agent, events, messages keys.
- Non-existent agent ID returns error message and exits non-zero.