---
name: no-sqlite-needed-e2e
type: functional
spec_id: run_01KJQERB5P8DCWZJXCZR5Z64BW
created_by: agt_01KJQERB5RN11QM94PWHDCE5WH
---

SCENARIO: Complete a full build lifecycle monitoring using only CLI commands — never open sqlite.

SETUP:
1. Initialize dark factory project
2. Prepare a spec with known content

TEST STEPS (simulate full lifecycle):
1. Start build: 'dark build <spec-id>'
2. Monitor with 'dark status' — verify spec title visible, phase visible
3. Monitor agents with 'dark agent list' — verify elapsed, cost, worktree, heartbeat all visible
4. Use 'dark agent list --active' to see only live agents
5. Inspect specific agent with 'dark agent show <id>' — verify full detail
6. If build fails, resume and use 'dark agent list --active' to confirm only new attempt agents shown
7. When build completes, use 'dark status --detail <run-id>' to see final summary

INFORMATION THAT MUST BE AVAILABLE WITHOUT SQLITE:
- Which agents are currently running (not just ever existed)
- How long each agent has been running
- How much each agent has cost so far  
- What files each builder has changed
- Where each builder's worktree is
- When each agent last sent a heartbeat
- What the spec title is (not just the ID)
- Which modules are done vs still building
- Full detail on any specific agent (mail, events, cost, tokens)

PASS CRITERIA:
- ALL of the information listed above is accessible through CLI commands
- No sqlite3 command is needed at any point during monitoring
- dark agent list shows enriched output (elapsed, cost, files, worktree, heartbeat)
- dark agent list --active correctly filters to current attempt agents
- dark agent show provides full agent inspection
- dark status shows spec title and module-level progress
- All commands work with --json flag for scriptable access

FAIL CRITERIA:
- Any of the listed information requires 'sqlite3 .df/state.db' to access
- CLI commands crash or show incomplete data
- Need to manually cd to worktree to see file counts