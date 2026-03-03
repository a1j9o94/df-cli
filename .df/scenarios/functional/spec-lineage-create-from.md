---
name: spec-lineage-create-from
type: functional
spec_id: run_01KJSRR01K5PXP0JVNMG3RYM19
created_by: agt_01KJSRR01N81B9Y97S0PMHKWX1
---

Precondition: Spec A exists (any status). Steps: 1) Run 'dark spec create --from <spec-A-id> "Follow-up: improved auth"'. 2) Verify the new spec file exists on disk and contains A's content as the starting body. 3) Read the new spec's frontmatter. Verify it contains 'parent_spec_id: <spec-A-id>'. 4) Query the specs table in the DB. Verify the new spec has parent_spec_id set to A's id. 5) Run 'dark spec history <new-spec-id>'. Expected output shows a chain: spec-A-id -> new-spec-id with titles. 6) Also run 'dark spec history <spec-A-id>' and verify it shows the same chain from A's perspective (A with its child). Pass criteria: New spec has parent_spec_id set correctly in both frontmatter and DB. History command shows full lineage chain. Original spec content is copied.