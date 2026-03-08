---
name: pipeline-shows-8-phases-not-7
type: functional
spec_id: run_01KK7R4Y51M8MH0WWAW1TXH2YX
created_by: agt_01KK7SV1AXZJDJ594NMWFP31HJ
---

Verify the landing page how-it-works section shows all 8 pipeline phases, not 7. The spec says '8-phase pipeline' and the phase cards show 8 phases (Scout, Architect, Plan Review, Build, Integrate, Evaluate, Iterate, Merge). Steps: (1) Count pipeline-step elements in the pipeline flow visualization. (2) Count phase-card elements in the phase grid. (3) Verify the pipeline flow shows 8 steps, not 7. The current code shows only 7 steps in the flow (scout → architect → plan-review → build → integrate → evaluate → merge) but 8 cards below (including Iterate). The flow visualization should match the cards. Pass criteria: Both the pipeline flow AND phase cards show exactly 8 phases.