---
name: planned-specs-from-backlog
type: functional
spec_id: run_01KJSYMVS0W36Y61PR2WNYBM7W
created_by: agt_01KJSYMVS1M06HAVTY6C5FAXR2
---

## Planned specs ordered by dependency layer

### Preconditions
- 5 draft specs with dependencies forming a 3-layer DAG
- No specs currently building or completed

### Setup Steps
1. Create spec A (no deps) — layer 0
2. Create spec B (no deps) — layer 0
3. Create spec C (depends_on: [A]) — layer 1
4. Create spec D (depends_on: [B]) — layer 1
5. Create spec E (depends_on: [C, D]) — layer 2
6. All specs remain in 'draft' status

### Test Steps
1. GET /api/timeline
2. Inspect the 'planned' section

### Expected Results
- 'planned' array contains exactly 5 entries
- Each entry has: specTitle (string), layer (number), depCount (number), estimatedCost (number or null)
- Specs A and B have layer=0, depCount=0
- Specs C and D have layer=1, depCount=1
- Spec E has layer=2, depCount=2
- Entries are ordered by layer ascending (layer 0 first, then 1, then 2)
- Within the same layer, order is consistent (e.g., alphabetical or by creation time)

### Pass/Fail Criteria
- PASS: All 5 specs present with correct layer numbers and dependency counts
- FAIL: Wrong layer assignments, missing specs, or not ordered by layer
- NOTE: If spec_dependencies table does not exist (dependency spec not yet built), the query should handle gracefully — either all specs at layer 0, or fall back to reading depends_on from frontmatter