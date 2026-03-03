---
name: add-spec-tagging
type: change
spec_id: run_01KJSRR01K5PXP0JVNMG3RYM19
created_by: agt_01KJSRR01N81B9Y97S0PMHKWX1
---

Modification: Add tags/labels to specs (e.g., --tag auth --tag v2). Implementation should only require: 1) A new 'tags' field in spec frontmatter (array of strings). 2) A --tag option on 'dark spec create'. 3) A --tag filter option on 'dark spec list' to filter by tag. Affected areas: src/types/spec.ts (add tags field), src/commands/spec/create.ts (add --tag option), src/commands/spec/list.ts (add --tag filter), src/db/schema.ts (add tags column or use JSON), src/db/queries/specs.ts (filter query). Expected effort: Small — no changes needed to any immutability guards (build.ts, engine.ts status transitions, archive, lineage). The guards should be completely independent of the tagging feature. Pass criteria: Tags can be added without modifying any of the 4 immutability guards. The guard logic is decoupled from spec metadata extensions.