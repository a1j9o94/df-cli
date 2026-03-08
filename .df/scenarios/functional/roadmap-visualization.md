---
name: roadmap-visualization
type: functional
spec_id: run_01KK7SEAH0J838RH3SWCBR48SQ
created_by: agt_01KK7SEAH1RRSGYDNFYKMRG751
---

## Test: Roadmap Visualization

### Preconditions
- Project has 5 specs with dependencies forming a diamond:
  - Spec A (completed) -> Spec B (building), Spec C (ready)
  - Spec B -> Spec D (blocked on B+C)
  - Spec C -> Spec D (blocked on B+C)
- A has a completed run, B is mid-build (phase: build 2/3 modules), C is ready (not started), D is blocked

### Steps
1. Run dark dash from the project directory
2. Navigate to Roadmap tab in the dashboard

### Expected Output
- Specs arranged in 3 layers left-to-right: Layer 1: A | Layer 2: B, C (stacked vertically) | Layer 3: D
- Dependency arrows: A->B, A->C, B->D, C->D
- Status badges: A=green (completed), B=pulsing blue (building) with progress bar showing 2/3, C=gray (ready/draft), D=amber with lock icon (blocked)
- D shows 'Waiting on: Spec B, Spec C' with links
- Hovering B highlights A (upstream) and D (downstream)
- Clicking completed Spec A shows run summary inline
- 'Start next' button visible on Spec C (ready but not building)

### Pass/Fail
- PASS: Layout correct (3 layers), arrows correct, all status badges match, hover/click interactions work
- FAIL: Wrong layer arrangement, missing arrows, incorrect status badges, or broken interactions