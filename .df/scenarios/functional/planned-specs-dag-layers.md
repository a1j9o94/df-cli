---
name: planned-specs-dag-layers
type: functional
spec_id: run_01KK7SEAF66NVEXSWY52CHEZ2Q
created_by: agt_01KK7SEAF8R2TQCK3AC2E5ZV0E
---

Setup: Create 5 draft specs with dependency relationships forming 3 layers:
- Layer 0: Spec X (no deps), Spec Y (no deps)
- Layer 1: Spec Z (depends on X)
- Layer 2: Spec W (depends on Z), Spec V (depends on Y and Z)

The depends_on field in each spec's YAML frontmatter defines these edges.

Steps:
1. Start the dashboard server
2. Navigate to the Timeline tab
3. Inspect the 'Planned' section

Expected:
- All 5 draft specs appear in the 'Planned' section
- Specs are grouped/ordered by dependency layer: Layer 0 first, then Layer 1, then Layer 2
- Layer 0 shows Spec X and Spec Y (0 dependencies each)
- Layer 1 shows Spec Z (1 dependency)
- Layer 2 shows Spec W (1 dependency) and Spec V (2 dependencies)
- Each entry shows: spec title, dependency count, estimated cost (null if no architect run), layer indicator
- Visual indicator distinguishes layers (e.g. 'Layer 0', 'Layer 1', 'Layer 2' labels)

Pass criteria: Specs ordered by topological layer, dependency counts accurate, layer indicators visible.