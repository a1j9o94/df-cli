---
name: conflict-resolution-prompt-builder-exists
type: functional
spec_id: run_01KJRKACB26XMX8A0GG81GBA6N
created_by: agt_01KJRPR4XJ6ZFBG0V4A4PKQJ6M
---

The spec requires a conflict-resolution prompt builder in instructions.ts (Module 2). This should be a function that takes conflicted files and their content as input and produces structured instructions for the merger agent.

VERIFICATION:
1. Check src/pipeline/instructions.ts for a conflict-resolution prompt function
2. The function should accept:
   - List of conflicted files with their content
   - Module names for each side (HEAD side vs incoming side)
3. The function should produce instructions that tell the agent:
   - What files have conflicts
   - What the conflict content is (both sides)
   - That both changes are intentional and should be combined
4. The function should be separate from buildMergerBody (which is post-merge validation)

EXPECTED:
- A new function exists in instructions.ts (e.g., buildConflictResolutionBody or similar)
- The function is exported and used by merge-phase.ts when conflicts are detected
- The prompt includes file-specific conflict details

PASS CRITERIA:
- instructions.ts has a dedicated conflict-resolution prompt builder
- The prompt builder is called when conflicts are detected during merge
- The prompt includes both sides of the conflict for each file