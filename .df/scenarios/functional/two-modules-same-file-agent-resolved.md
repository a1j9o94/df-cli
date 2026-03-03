---
name: two-modules-same-file-agent-resolved
type: functional
spec_id: run_01KJRKACB26XMX8A0GG81GBA6N
created_by: agt_01KJRKACB4M7MSFDSCEN1VJ9T4
---

Two parallel builders modify the same line/function in the same file, causing a real merge conflict. The merger agent must be spawned with conflict details, resolve the conflict, and the merge must complete.

SETUP:
1. Create a git repo with initial commit containing src/config.ts:
   export function getTimeout() { return 1000; }
   export function getRetries() { return 3; }

2. Create worktree branch 'builder-mod-a' that modifies getTimeout():
   export function getTimeout() { return 2000; } // Module A: doubled timeout

3. Create worktree branch 'builder-mod-b' that also modifies getTimeout():
   export function getTimeout() { return 5000; } // Module B: 5x timeout for resilience

EXECUTION:
1. Merge builder-mod-a first — should succeed cleanly (no prior changes to conflict with)
2. Merge builder-mod-b second — MUST conflict (same line modified differently on both sides)
3. On conflict detection:
   a. The system should NOT fail/abort
   b. The system should detect conflicted files (src/config.ts)
   c. The system should read the conflict content including <<<<<<< / ======= / >>>>>>> markers
   d. The system should spawn the merger agent with:
      - List of conflicted files
      - Conflict content for each file
      - Module names for each side (HEAD = mod-a already merged, incoming = mod-b)
   e. Wait for agent to complete
   f. Verify no conflict markers remain after resolution

EXPECTED:
- builder-mod-a merges cleanly
- builder-mod-b triggers conflict detection
- Merger agent is spawned with conflict-specific instructions (not just post-merge validation)
- The agent instructions/prompt includes the conflicted file paths and conflict content
- After agent resolution, no conflict markers (<<<<<<< / ======= / >>>>>>>) remain in any tracked file
- The merge phase completes successfully (does not throw)

PASS CRITERIA:
- executeMergePhase completes without error
- A merger agent was spawned with conflict context (conflicted files listed in prompt/instructions)
- scanConflictMarkers() returns { found: false } after merge
- src/config.ts exists and has a valid (non-conflicted) getTimeout() function