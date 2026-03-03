---
name: pause-and-resume-preserves-work
type: functional
spec_id: run_01KJSS7KPSXHDFWHRE2S286JK5
created_by: agt_01KJSS7KPV70WHZAJMQ3TAZSBY
---

SETUP: Start a build run. Wait for a builder agent to be spawned and make at least one commit in its worktree (verify via getWorktreeCommits or git log in worktree). ACTIONS: (1) Run dark pause {runId}. (2) Verify agent status is 'paused' in DB. (3) Verify worktree contents were moved to .df/worktrees/paused/{moduleId}/. (4) Run dark resume {runId}. (5) Verify a NEW agent is spawned with worktree_path pointing to the preserved location. (6) Verify the resumed builder's worktree contains the files/commits from the first attempt (git log shows previous commits). EXPECTED: The resumed builder has access to ALL prior work. It does NOT start from scratch. The agent receives mail with context about continuing from where it left off. PASS CRITERIA: (a) After pause: agent.status === 'paused', run.status === 'paused', worktree exists at .df/worktrees/paused/{moduleId}/. (b) After resume: new agent spawned in same worktree, git log shows original commits, agent receives instruction mail referencing module continuation.