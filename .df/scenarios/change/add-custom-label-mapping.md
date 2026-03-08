---
name: add-custom-label-mapping
type: change
spec_id: run_01KK713FAZE5AV73F5HB66BPVF
created_by: agt_01KK713FB00321PM7C8TQ1YDQZ
---

Changeability test: Adding custom label-to-type/priority mappings from .df/config.yaml.

Modification: Allow users to define custom label mappings in .df/config.yaml like:
  label_mappings:
    type:
      'needs-fix': bug
      'idea': feature
    priority:
      'fire': critical
      'nice-to-have': low

Verification:
- Only src/importers/label-mapper.ts needs to change (read config, merge with defaults)
- No changes to src/importers/github.ts (fetcher)
- No changes to src/importers/spec-generator.ts
- No changes to src/importers/import-spec.ts
- No changes to src/commands/spec/create.ts

Expected effort: ~15-20 lines added to label-mapper.ts to load and merge config
Affected areas: label-mapper.ts only, plus reading from .df/config.yaml via existing getConfig() utility

Pass criteria: Custom label mappings can be added by only modifying label-mapper.ts to read config — no changes to fetcher, generator, or CLI command.