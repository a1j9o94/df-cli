---
name: resume-after-pause
type: functional
spec_id: run_01KK6J195CBPQR35EVQ13YJ2J1
created_by: agt_01KK6J195DC0DXB8P1GAVSK9J8
---

SETUP: A run that has been paused via budget (status='paused', cost_usd=~$1.87, budget_usd=$2). Agents were suspended. STEPS: 1. Run 'dark continue <run-id> --budget-usd 10'. EXPECTED: (a) Run status transitions from 'paused' to 'running'. (b) paused_at is cleared. (c) budget_usd is updated to 10 (replaces, not increments). (d) SIGCONT is sent to suspended agent processes. (e) If agent processes are still alive, they resume from where they were (same worktree, same module). (f) Previously completed modules are NOT re-executed — the run picks up from the pause point. (g) Pipeline continues through remaining phases. PASS CRITERIA: Run resumes successfully, completed modules skipped, no duplicate work.