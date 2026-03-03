---
name: add-pause-timeout
type: change
spec_id: run_01KJSS7KPSXHDFWHRE2S286JK5
created_by: agt_01KJSS7KPV70WHZAJMQ3TAZSBY
---

MODIFICATION: Add auto-pause after N minutes of agent inactivity (no heartbeat). DESCRIPTION: A timer in the engine's polling loop detects when all agents in a run have been inactive (no heartbeat update) for N minutes and automatically triggers the pause flow. AFFECTED AREAS: Only src/pipeline/engine.ts (or agent-lifecycle.ts polling loop) should need changes. The pause command logic (pause.ts), resume command (resume.ts), worktree persistence (worktree.ts), and type definitions should NOT need changes. EXPECTED EFFORT: Small — add a heartbeat staleness check in the existing poll loop that calls the same pause logic already implemented. No new types, no new commands, no schema changes. VALIDATION: (a) pause.ts is NOT modified. (b) resume.ts is NOT modified. (c) worktree.ts is NOT modified. (d) types/agent.ts and types/event.ts are NOT modified. (e) Only engine.ts or agent-lifecycle.ts gains a timer/staleness check. (f) The auto-pause triggers the same code path as manual dark pause.