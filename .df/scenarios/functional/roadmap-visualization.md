---
name: roadmap-visualization
type: functional
spec_id: run_01KJT1F6D5K21YTBJJ2QG4QY7E
created_by: agt_01KJT1F6D7F50TK3PWRMAKQHN9
---

# Roadmap Visualization

## Preconditions
- Project at /tmp/test-roadmap/ with .df/ initialized
- 5 specs exist with dependency relationships forming a diamond:
  - spec_A: no dependencies (completed)
  - spec_B: depends_on: [spec_A] (building, at build phase with 2/3 modules done)
  - spec_C: depends_on: [spec_A] (draft, ready to build — should show as ready)
  - spec_D: depends_on: [spec_B, spec_C] (draft, blocked on B and C)
  - spec_E: no dependencies (failed)
- Specs have frontmatter depends_on fields properly set

## Steps
1. cd /tmp/test-roadmap/
2. Run: dark dash
3. Navigate to the Roadmap tab in the project-level dashboard
4. Observe the graph rendering

## Expected Output
1. Roadmap tab appears in the project-level dashboard tab bar
2. Specs arranged in 3 layers (left-to-right):
   - Layer 0: spec_A, spec_E (no upstream dependencies)
   - Layer 1: spec_B, spec_C (depend on layer 0)
   - Layer 2: spec_D (depends on layer 1)
3. Spec cards show:
   - spec_A: green badge (completed), title
   - spec_B: pulsing blue badge (building), progress "build 2/3 modules", cost
   - spec_C: gray badge (draft/ready), title
   - spec_D: amber badge with lock icon (blocked), "Waiting on: spec_B, spec_C"
   - spec_E: red badge (failed), title
4. Dependency arrows connect: A→B, A→C, B→D, C→D
5. Hover over spec_B highlights: A (upstream), D (downstream)
6. Click on spec_A shows run summary inline
7. Click on spec_D shows blocking specs with links

## Pass Criteria
- API endpoint GET /api/specs/graph returns correct node and layer structure
- All 5 specs render with correct status badges
- Layer computation is correct (topological sort)
- Dependency arrows render between correct nodes
- Hover interaction highlights upstream/downstream connections
- Progress bar shows on building specs
- Blocked specs show their blockers