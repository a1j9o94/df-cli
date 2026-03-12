---
name: agent-show-detail
type: functional
spec_id: run_01KKFJP2B248H395WES5SRNHWM
created_by: agt_01KKFJP2B477G0FJ56QPN8P0HA
---

Test that dark agent show <id> displays full agent detail including mail history, events, and files changed.

SETUP:
1. Create test DB, run, and builder agent with full data:
   - worktree_path: '/tmp/parser-abc'
   - module_id: 'parser'
   - cost_usd: 0.62 (via updateAgentCost)
   - tokens_used: 5000
   - pid: 12345 (via updateAgentPid)
   - last_heartbeat: set via updateAgentHeartbeat
   - tdd_phase: 'green', tdd_cycles: 3
2. Create events: agent-spawned, agent-heartbeat (via createEvent)
3. Create messages: 2 messages to the agent from another agent (via createMessage)

VERIFICATION - getAgentDetail:
- Call getAgentDetail(db, agentId) from src/db/queries/agent-queries.ts
- Result MUST NOT be null
- result.agent.id matches agentId
- result.events has length >= 2
- result.messages has length >= 2

VERIFICATION - formatAgentDetail output:
- Call formatAgentDetail(detail) from src/utils/format-agent-detail.ts (passing files changed)
- Output MUST contain ALL of these fields:
  - 'Agent: agt_...' (agent ID)
  - 'Name:' with agent name
  - 'Role:          builder'
  - 'Status:        running'
  - 'PID:           12345'
  - 'Module:        parser'
  - 'Worktree:      /tmp/parser-abc'
  - 'Elapsed:' with human-readable time
  - 'Heartbeat:' with relative time (not 'never')
  - 'Cost:          $0.62'
  - 'Tokens:        5,000'
  - 'Files Changed:' with a count (must be present in output)
  - 'Events (2):' section with event types listed
  - 'Messages (2):' section with message bodies

VERIFICATION - error display:
- Create a failed agent with error='Build failed: tests not passing'
- formatAgentDetail output MUST contain 'Error:         Build failed: tests not passing'

PASS CRITERIA:
- All specified fields appear in output
- Files changed count is shown (this is a NEW requirement - must be added to formatAgentDetail)
- Events listed in reverse chronological order
- Messages shown with sender info and body