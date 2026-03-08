---
name: roadmap-view
type: functional
spec_id: run_01KK7R4Y6S9X8AQA0BPDTRZ039
created_by: agt_01KK7R4Y6VS8TXZ8FQ3TWGRQTG
---

PRECONDITION: Five specs at different dependency layers:
- A: no deps, status=completed
- B: depends_on [A], status=building
- C: no deps, status=draft
- D: depends_on [B, C], status=draft
- E: depends_on [D], status=draft

STEPS:
1. Run: dark roadmap
2. Run: dark roadmap --json

EXPECTED (text output):
- Specs grouped by dependency layer:
  Layer 0: A [completed], C [draft]
  Layer 1: B [building]
  Layer 2: D [draft]
  Layer 3: E [draft]
- Status indicators visible for each spec (e.g., checkmark, spinner, dash)
- Shows spec title alongside ID

EXPECTED (JSON output):
- Valid JSON array of layer objects
- Each layer has: { layer: number, specs: SpecRecord[] }
- Layers are numbered 0, 1, 2, 3
- Each spec includes id, title, status at minimum

PASS/FAIL:
- PASS if layers are correctly computed and displayed with statuses
- FAIL if layer assignment is wrong (e.g., D in layer 1), or JSON is invalid