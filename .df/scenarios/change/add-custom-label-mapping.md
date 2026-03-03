---
name: add-custom-label-mapping
type: change
spec_id: run_01KJSS4TD4WH5VKGWK6YWSWJZQ
created_by: agt_01KJSS4TD5H3A6M3NHC0H95JFZ
---

Modification: Allow users to define custom label-to-type and label-to-priority mappings in .df/config.yaml.\n\nExample config.yaml addition:\nlabel_mapping:\n  type:\n    incident: bug\n    improvement: feature\n    story: feature\n  priority:\n    blocker: critical\n    minor: low\n    trivial: low\n\nExpected changes required:\n1. Read .df/config.yaml in the label mapper function (src/importers/spec-mapper.ts) — add config reading at the top of the label mapping function\n2. Merge user-defined mappings with defaults (user mappings take precedence)\n3. No schema changes to IssueData, IssueImporter, or SpecFrontmatter\n\nFiles that should NOT need changes:\n- src/importers/github.ts (fetcher doesn't care about label mapping)\n- src/importers/types.ts (interface unchanged)\n- src/importers/registry.ts (registry unchanged)\n- src/commands/spec/create.ts (CLI unchanged)\n- Any pipeline, db, or utils files\n\nEstimated effort: ~20 lines added to spec-mapper.ts (read config, merge mappings).\n\nPass criteria: Custom label mapping requires changes ONLY in the spec mapper module. No changes to fetcher, registry, CLI, or interfaces.