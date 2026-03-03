---
name: add-priority-ordering-within-layers
type: change
spec_id: run_01KJT1DSC7RYMZBNXACN9871DA
created_by: agt_01KJT1DSC9A3PD8YJAG21ECY1N
---

CHANGE SCENARIO: Add priority ordering within dependency layers
DESCRIPTION:
Within the same dependency layer, specs should be ordered by their priority field (from frontmatter). Currently getReadySpecs and getSpecLayers return specs in arbitrary order within a layer. After this change, specs within the same layer should be sorted by priority (high > medium > low).

AFFECTED AREAS:
- src/db/queries/spec-deps.ts: getReadySpecs() — add ORDER BY based on priority
- src/db/queries/spec-deps.ts: getSpecLayers() — sort specs within each layer by priority
- Possibly src/types/spec.ts: ensure priority field is available on SpecRecord

EXPECTED EFFORT: Low — requires adding a sort comparator in getReadySpecs and getSpecLayers. No DAG logic changes needed. Priority is already stored in spec frontmatter; may need to be persisted to DB specs table if not already there.

VERIFICATION:
- Create 3 specs at layer 0: spec_A (priority=low), spec_B (priority=high), spec_C (priority=medium)
- getReadySpecs should return [spec_B, spec_C, spec_A]
- getSpecLayers layer 0 should list [spec_B, spec_C, spec_A]
- No changes to cycle detection or dependency management needed