---
name: priority-ordering-changeability
type: change
spec_id: run_01KK7R4Y6S9X8AQA0BPDTRZ039
created_by: agt_01KK7R4Y6VS8TXZ8FQ3TWGRQTG
---

MODIFICATION: Within the same dependency layer, specs should be ordered by their priority field (from frontmatter: priority high > medium > low).

AFFECTED AREAS:
- getReadySpecs() query — add ORDER BY based on priority
- getSpecLayers() — sort specs within each layer by priority
- dark swarm — when multiple specs are ready, build higher-priority ones first
- SpecFrontmatter interface — priority field already exists

EXPECTED EFFORT:
- 1-2 hours of work
- Changes to: src/db/queries/spec-dependencies.ts (new file from this spec), possibly src/types/spec.ts
- No DAG logic changes needed — purely a sort within existing layer computation
- May need to add priority column to specs table if not already there (it exists in frontmatter but may not be in DB)

VERIFICATION:
- Create 3 specs in same layer with priorities high, low, medium
- dark spec ready should list them in order: high, medium, low
- dark swarm should build high-priority spec first when --parallel 1

PASS/FAIL:
- PASS if change requires only sorting logic, no DAG restructuring
- FAIL if implementing priority ordering requires fundamental changes to dependency resolution