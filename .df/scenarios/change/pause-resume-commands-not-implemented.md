---
name: pause-resume-commands-not-implemented
type: change
spec_id: run_01KJSS7KPSXHDFWHRE2S286JK5
created_by: agt_01KJT3FJ5RPKEH10EDA42DS0H9
---

CHANGEABILITY SCENARIO: The spec requires dark pause and dark resume commands, but neither src/commands/pause.ts nor src/commands/resume.ts exist. No pauseCommand or resumeCommand is registered in src/index.ts. AgentStatus type does not include 'paused'. EventType does not include 'run-paused'. No SIGTERM/SIGKILL agent stopping logic exists. No worktree persistence to .df/worktrees/paused/ exists. The entire pause/resume feature is unimplemented, making all dependent changeability scenarios (add-pause-timeout, add-per-module-budgets) impossible to evaluate. VERIFICATION: 1. ls src/commands/pause.ts — not found. 2. ls src/commands/resume.ts — not found. 3. grep paused src/types/agent.ts — not found in AgentStatus. 4. grep run-paused src/types/event.ts — not found. PASS CRITERIA: PASS if pause.ts and resume.ts exist with working pause/resume flow. FAIL if commands are missing.