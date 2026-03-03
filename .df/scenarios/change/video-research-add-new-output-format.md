---
name: video-research-add-new-output-format
type: change
spec_id: run_01KJT1F6B8P7286PNQFFEBC6YK
created_by: agt_01KJT5YPKE616DB9XQV0Q338Y0
---

CHANGEABILITY SCENARIO: Adding a new output format (e.g., JSON transcript, structured chapters) to the video research command. MODIFICATION: dark research video should support a --format <text|json|chapters> flag that changes how transcript content is saved. EXPECTED EFFORT: 1 file change to video-action.ts (add format option) + 1-2 new builder functions in video-utils.ts. No DB schema changes, no research types changes, no instructions.ts changes. VERIFICATION: (1) VideoResearchOptions interface in video-action.ts should only need a new optional format field. (2) The createResearchArtifact call stays the same (still type=text, content=string). (3) No changes to video.ts commander definition beyond adding --format option. PASS: Adding a new output format requires changes to at most 2 files (video-action.ts + video-utils.ts) with no storage/schema changes. FAIL: Adding a format requires changing the DB schema, research types, or instruction pipeline.