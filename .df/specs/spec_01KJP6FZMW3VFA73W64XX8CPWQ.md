---
id: spec_01KJP6FZMW3VFA73W64XX8CPWQ
title: "Enrich CLI output: never need raw sqlite"
type: bug
status: draft
version: 0.1.0
priority: high
depends_on:
  - spec_01KJNXCXHZERBM2C31QW0R0ZZC
---

# Enrich CLI Output

## Problem

During real pipeline monitoring, we repeatedly had to fall back to `sqlite3 .df/state.db` because the CLI commands didn't show enough information. If a user needs sqlite to understand what's happening, the CLI has failed.

Specific gaps encountered in a real session:

1. `dark agent list` doesn't show: worktree path, elapsed time, estimated cost for running agents, files changed, last heartbeat time
2. `dark status` doesn't show: per-module build progress, which modules are done vs in progress, spec title (only shows spec ID)
3. `dark agent list` shows ALL agents including dead ones from previous attempts — no way to filter to just the current active set
4. No way to inspect a single agent in detail (`dark agent show <id>` doesn't exist)
5. No way to see what files a builder has produced without manually `cd`-ing to its worktree

## Requirements

### `dark agent list` improvements
Current: `agt_01XYZ  builder-foo (builder)  running pid=1234 module=foo`

Should be:
```
agt_01XYZ  builder-foo (builder)  running  12m 34s  ~$0.62  3 files  module=foo
  worktree: /var/folders/.../foo-mm8abc
  last heartbeat: 2m ago
```

Fields to add:
- Elapsed time (human readable: "12m 34s")
- Estimated cost (live, computed from elapsed × rate)
- Files changed count (from `git status` in worktree)
- Worktree path
- Last heartbeat relative time ("2m ago" or "never")

### `dark agent list` filtering
- `dark agent list --active` — only show agents with live PIDs (excludes dead/completed from previous attempts)
- `dark agent list --run-id <id>` — already exists, keep it
- `dark agent list --module <id>` — show agents for a specific module (latest attempt only)
- Default behavior: show latest agent per module, not all historical attempts

### `dark agent show <id>` — new command
- Full detail view of a single agent
- Shows everything: id, role, name, status, pid, module, worktree path, cost, tokens, files changed, created_at, last heartbeat, elapsed, error (if failed)
- Shows the agent's mail history (recent messages received)
- Shows the agent's events (spawned, heartbeat, completed/failed)

### `dark status` improvements
Current: `run_01XYZ  running  spec=spec_01ABC  phase=build  agents=2/5  $1.33/$15.00`

Should also show:
- Spec title (not just ID)
- Per-module progress inline: `modules: merge-lock(done) engine-rebase(building 12m) queue-vis(building 11m)`
- Active agent count vs total (current), but clarify: "2 active, 1 completed, 2 dead"

### `dark status --detail <run-id>` — expanded single-run view
- Full phase timeline with elapsed per phase
- Module grid with status, builder name, elapsed, files
- Scenario results (if past evaluate phase)
- Cost breakdown by agent role

## Scenarios

### Functional

1. **Agent list shows elapsed and cost**: Start a build, run `dark agent list` while builders run. Verify elapsed time and estimated cost are shown for running agents.

2. **Agent list shows worktree path**: Verify each builder shows its worktree path without needing sqlite.

3. **Agent list filters to active**: `dark agent list --active` shows only agents with live PIDs. Dead agents from previous resume attempts are excluded.

4. **Agent show detail**: `dark agent show <id>` shows full agent detail including mail history and events.

5. **Status shows spec title**: `dark status` shows the spec title alongside the spec ID.

6. **Status shows module progress**: `dark status` shows per-module build status inline (done/building/pending).

7. **No sqlite needed**: Complete a full build lifecycle (build, fail, resume, complete) using only `dark status`, `dark agent list`, and `dark agent show` for monitoring. Never open sqlite.

### Changeability

1. **Add new field to agent list**: Adding a new agent metric (e.g. "memory usage") should only require adding it to the agent query and the format string. No structural changes.
