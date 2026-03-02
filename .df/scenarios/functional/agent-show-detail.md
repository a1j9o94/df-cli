---
name: agent-show-detail
type: functional
spec_id: run_01KJR3DRQJPAE01XP0BJ0TGM1E
created_by: agt_01KJR3DRQKZK8N369V2TJZ66EJ
---

Test: 'dark agent show <id>' displays full agent detail including mail history and events.

SETUP:
1. Initialize in-memory DB
2. Create a run record (run_01TEST) with spec_id=spec_01TEST
3. Create an agent (agt_01TEST) with: role=builder, name=builder-auth, status=running, pid=12345, module_id=mod-auth, worktree_path=/tmp/wt-auth, cost_usd=1.50, tokens_used=50000, created_at=15 minutes ago, last_heartbeat=2 minutes ago
4. Create 2 messages TO this agent (from orchestrator)
5. Create 3 events for this agent (agent-spawned, agent-heartbeat, agent-heartbeat)

EXECUTE:
Run 'dark agent show agt_01TEST'

EXPECTED OUTPUT must include ALL of:
- Agent ID: agt_01TEST
- Role: builder
- Name: builder-auth
- Status: running
- PID: 12345
- Module: mod-auth
- Worktree: /tmp/wt-auth
- Cost: $1.50
- Tokens: 50,000 (or 50000)
- Created: (timestamp or relative time)
- Last heartbeat: (relative time like '2m ago')
- Elapsed: ~15m (or similar human-readable)
- Mail history section with at least 2 messages
- Events section with at least 3 events

PASS CRITERIA:
- The command 'dark agent show' exists and is registered
- All listed fields appear in output
- Mail messages show sender and body excerpt
- Events show type and timestamp
- If agent not found, outputs error 'Agent not found: <id>'