---
name: switch-merge-strategy-isolation
type: change
spec_id: run_01KJRKACB26XMX8A0GG81GBA6N
created_by: agt_01KJRKACB4M7MSFDSCEN1VJ9T4
---

Changing from git merge to git rebase (or vice versa) should only require updating the merge command in ONE function, not the conflict detection or agent handoff logic.

MODIFICATION:
Replace 'git merge --no-commit' with 'git rebase' (or another merge strategy) in the merge implementation.

AFFECTED AREAS:
- Only src/pipeline/rebase-merge.ts should need to change (specifically the mergeSingleBranch function or equivalent)
- src/pipeline/merge-phase.ts should NOT need to change (it handles conflict detection/handoff generically)
- src/pipeline/instructions.ts should NOT need to change (the conflict prompt is strategy-agnostic)
- src/agents/prompts/merger.ts should NOT need to change

VERIFICATION:
1. Locate all occurrences of 'git merge' in the codebase related to the sequential merge flow
2. They should all be in one function in rebase-merge.ts (e.g., mergeSingleBranch)
3. The conflict detection logic (checking for conflicted files, reading conflict content) should be separate from the merge command itself but still in the same file
4. The agent handoff logic (spawning the agent, waiting, verifying) in merge-phase.ts should work regardless of which git strategy produced the conflicts

EXPECTED EFFORT:
- 1 file, 1-2 functions to change
- No changes to the conflict detection, agent spawning, or prompt generation code
- The merge strategy is a plug-in detail, not a structural concern

PASS CRITERIA:
- The git merge command is isolated in a single function
- merge-phase.ts does not contain any git merge/rebase commands directly
- instructions.ts does not reference the specific merge strategy
- Changing the strategy is a 1-line change (the git command string)