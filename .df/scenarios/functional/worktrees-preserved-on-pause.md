---
name: worktrees-preserved-on-pause
type: functional
spec_id: run_01KK6J195CBPQR35EVQ13YJ2J1
created_by: agt_01KK6J195DC0DXB8P1GAVSK9J8
---

SETUP: Start a build with a low budget so it pauses mid-build phase. STEPS: 1. Run 'dark build <spec-id> --budget-usd 2' where the build has multiple modules. 2. Wait for pause to trigger during build phase. 3. Check filesystem at .df/runs/<run-id>/worktrees/. EXPECTED: (a) Worktree directories still exist on disk. (b) Worktrees contain uncommitted code from in-progress modules. (c) Agent records in DB retain worktree_path values. (d) No cleanup or archival happened to the worktrees. (e) Running 'git status' inside a worktree shows the working state. PASS CRITERIA: All builder worktrees intact with their in-progress code.