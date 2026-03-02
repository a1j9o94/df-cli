---
name: agent-show-detail
type: functional
spec_id: run_01KJQERB5P8DCWZJXCZR5Z64BW
created_by: agt_01KJQERB5RN11QM94PWHDCE5WH
---

SCENARIO: 'dark agent show <id>' displays full agent detail including mail history and events.

SETUP:
1. Initialize dark factory project
2. Run a build to completion (or at least through build phase)
3. Identify a builder agent ID that has: cost_usd > 0, tokens_used > 0, at least 1 heartbeat event, at least 1 message received, a worktree_path set

TEST STEPS:
1. Run 'dark agent show <agent-id>' with a known agent ID
2. Verify all expected fields are present in output

EXPECTED OUTPUT (all fields present):
  Agent: agt_01XXXXX
  Name:       builder-foo
  Role:       builder
  Status:     running
  PID:        12345
  Module:     some-module-id
  Worktree:   /var/folders/.../foo-mm8abc
  Cost:       $0.62
  Tokens:     15,234
  Files:      3 changed
  Created:    2024-01-01T00:00:00Z
  Heartbeat:  2m ago
  Elapsed:    12m 34s
  Error:      (none or error text if failed)

  Recent Messages (last 10):
    2024-01-01T00:00:00Z from=orchestrator: Build module foo...
    ...

  Events (last 20):
    2024-01-01T00:00:00Z agent-spawned
    2024-01-01T00:00:05Z agent-heartbeat
    ...

PASS CRITERIA:
- Command 'dark agent show <id>' is recognized and executes without error
- All fields listed above are present in output (id, name, role, status, pid, module, worktree, cost, tokens, files, created_at, heartbeat relative time, elapsed time, error)
- Mail/message history section is shown with recent messages
- Events section is shown with agent lifecycle events
- Cost is formatted with dollar sign
- Tokens are formatted with comma separators
- Heartbeat shows relative time ('2m ago') not raw ISO timestamp
- If agent ID doesn't exist, shows a clear error message (not a crash)
- Works with --json flag for machine-readable output

FAIL CRITERIA:
- Command not found / not registered
- Missing any of the required fields
- Crash on non-existent agent ID
- Messages or events sections missing