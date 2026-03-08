---
name: agent-show-full-detail
type: functional
spec_id: run_01KK6QXFCV1988195YMPGM2QCS
created_by: agt_01KK6QXFCW27WCTXH47YAQPC0D
---

PRECONDITION: A run with at least one agent that has: cost_usd > 0, tokens_used > 0, a worktree_path set, messages received, and events logged.

STEPS:
1. Run: dark agent show <agent-id>

EXPECTED OUTPUT (all fields present):
  Agent: agt_XXXXX
  Name:       builder-name
  Role:       builder
  Status:     running
  PID:        12345
  Module:     module-id
  Worktree:   /path/to/worktree
  Branch:     df/module-id-xxxxx
  Cost:       $0.62
  Tokens:     15,234
  Files:      3 files
  Created:    2026-03-08T12:00:00Z
  Elapsed:    12m 34s
  Heartbeat:  2m ago
  Error:      (none or error text)

  Recent Messages (N):
    2026-03-08T12:01:00Z from=orchestrator: <body truncated>
    ...

  Events (N):
    2026-03-08T12:00:00Z agent_spawned
    2026-03-08T12:05:00Z agent_heartbeat
    ...

PASS CRITERIA:
- Command exists and accepts an agent ID argument
- All listed fields are displayed
- Messages section shows mail history for the agent
- Events section shows agent events
- If agent ID not found, shows error and exits with code 1
- --json flag outputs all data as JSON