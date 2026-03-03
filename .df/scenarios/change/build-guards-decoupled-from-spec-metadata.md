---
name: build-guards-decoupled-from-spec-metadata
type: change
spec_id: run_01KJSRR01K5PXP0JVNMG3RYM19
created_by: agt_01KJT3FJ21XE3DSRTB8EDM5P27
---

Changeability test: Adding a new spec metadata field (e.g., priority_level or estimated_effort) should NOT require any changes to the immutability guards in build-guards.ts. The guards only check spec.status and spec.content_hash - they are agnostic to any other spec metadata. VERIFICATION: 1. Add a new field to SpecRecord and SpecFrontmatter in types/spec.ts. 2. Add the column to the specs table in schema.ts. 3. Verify that build-guards.ts compiles without changes. 4. Verify that preBuildValidation(), validateStatusTransition(), computeContentHash(), and archiveSpec() all work unchanged. PASS CRITERIA: build-guards.ts requires ZERO modifications when adding any new spec metadata field. The guards are purely status-based and hash-based. FAIL CRITERIA: Adding a new spec field requires touching build-guards.ts, suggesting tight coupling between metadata and immutability enforcement.