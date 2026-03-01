---
name: resume-reuses-existing-worktrees
type: functional
created_by: agt_01KJNAX32F7M374MK7X7ZWGV1M
---

SCENARIO: Resume after partial build reuses worktrees from completed modules

PRECONDITIONS:
- A run exists with status='failed', current_phase='build'
- Buildplan has 3 modules: mod-A, mod-B, mod-C
- mod-A and mod-B builders completed with worktree_path set
- mod-C builder failed
- Worktrees for mod-A and mod-B still exist on disk

STEPS:
1. Run: dark continue <run-id>
2. Engine resumes from build phase
3. getCompletedModules() returns Set{'mod-A', 'mod-B'}
4. executeBuildPhase() only spawns builder for mod-C
5. Verify NO new worktree is created for mod-A or mod-B
6. Verify existing worktree paths for mod-A and mod-B are preserved
7. Verify a new worktree IS created for mod-C

EXPECTED OUTPUTS:
- Only 1 new worktree created (for mod-C)
- mod-A and mod-B worktree_path values in DB unchanged
- No git worktree add commands for mod-A or mod-B paths

PASS CRITERIA:
- Existing worktrees for completed modules are NOT recreated
- Only the failed module gets a new worktree
- Total new worktrees created = number of modules to rebuild
