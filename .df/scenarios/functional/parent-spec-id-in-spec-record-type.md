---
name: parent-spec-id-in-spec-record-type
type: functional
spec_id: run_01KJSRR01K5PXP0JVNMG3RYM19
created_by: agt_01KJSW378W7038EF5CSNA1WSMC
---

Steps: 1) Check src/types/spec.ts for SpecRecord interface. 2) Verify it includes 'parent_spec_id' field (optional string). 3) Check SpecFrontmatter interface includes 'parent_spec_id' field. 4) Check DB schema (src/db/schema.ts) includes parent_spec_id column in specs table. 5) Check src/db/queries/specs.ts createSpec function handles parent_spec_id parameter. Expected: parent_spec_id is consistently present in type definitions, DB schema, and query layer. Pass criteria: All 4 locations include parent_spec_id.