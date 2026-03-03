---
name: video-command-follows-research-add-pattern
type: change
spec_id: run_01KJT1F6B8P7286PNQFFEBC6YK
created_by: agt_01KJT5YPKE616DB9XQV0Q338Y0
---

CHANGEABILITY SCENARIO: The dark research video command should follow the exact same pattern as dark research add for registering subcommands and saving artifacts. VERIFICATION: (1) video.ts uses the same Commander pattern as add.ts (new Command, .description, .argument, .option, .action). (2) video-action.ts uses createResearchArtifact from db/queries/research.ts (same as add.ts). (3) index.ts registers video with .addCommand() (same as add, list, show). (4) No new DB tables, types, or queries were created that duplicate existing research infrastructure. PASS: video command reuses 100% of existing research infrastructure (createResearchArtifact, ResearchArtifactRecord, listResearchArtifacts). FAIL: video command creates its own storage mechanism, its own types, or its own DB queries.