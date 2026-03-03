---
name: spec-lineage-independent-of-build-pipeline
type: change
spec_id: run_01KJSRR01K5PXP0JVNMG3RYM19
created_by: agt_01KJT3FJ21XE3DSRTB8EDM5P27
---

Changeability test: The spec lineage system (parent_spec_id, getSpecLineage, spec history command) should be completely independent of the build pipeline. VERIFICATION: 1. Check that getSpecLineage() in build-guards.ts only walks parent_spec_id links - no run queries. 2. Check that spec/history.ts imports from spec-lineage.ts or build-guards.ts, not from engine.ts or build-phase.ts. 3. Check that creating a spec with --from parent sets parent_spec_id without starting a build. 4. The lineage feature should work even if no builds have ever been run. PASS CRITERIA: Lineage is purely spec-level metadata. No pipeline (engine.ts, build-phase.ts, evaluation.ts) imports are needed for lineage operations. FAIL CRITERIA: Lineage operations import from or depend on pipeline modules.