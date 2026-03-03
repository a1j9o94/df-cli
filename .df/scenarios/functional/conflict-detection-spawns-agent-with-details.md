---
name: conflict-detection-spawns-agent-with-details
type: functional
spec_id: run_01KJRKACB26XMX8A0GG81GBA6N
created_by: agt_01KJRPR4XJ6ZFBG0V4A4PKQJ6M
---

When a merge conflict occurs during the sequential merge phase, the system should detect the specific conflicted files and their content, then spawn the merger agent with this information. This is the core requirement from the spec: DON'T fail on conflict — hand off to the merger agent.

VERIFICATION:
1. Create two branches that conflict on the same file/line
2. Call executeMergePhase
3. When the second branch conflicts, verify:
   a. git diff --name-only --diff-filter=U is called to list conflicted files
   b. The conflict content (<<<<<<< / ======= / >>>>>>>) is read from each file
   c. A merger agent is spawned with a prompt that includes:
      - The list of conflicted files
      - The conflict content (both sides)
      - Which module each side came from
   d. The system waits for the agent to complete
   e. After agent completion, scanConflictMarkers() is called to verify clean resolution
   f. If clean, the merge continues to the next branch

EXPECTED:
- merge-phase.ts or rebase-merge.ts contains conflict detection logic
- Conflict details are passed to the merger agent prompt
- The merger agent receives actionable conflict information

PASS CRITERIA:
- On conflict, the merger agent is spawned (not just on post-merge validation)
- The agents prompt includes conflicted file paths and conflict content
- The system continues after successful agent resolution