---
name: from-phase-cli-validates-against-phase-order
type: change
spec_id: run_01KJSXZQ3JXJC5FPHJJE6JK73S
created_by: agt_01KJT3FHWEK01XTN89FGPXYJ2X
---

Verify that the --from-phase CLI option in continue.ts validates the user input against PHASE_ORDER before passing to engine.resume(). PASS if continue.ts imports PHASE_ORDER and checks indexOf or uses Commander .choices(). FAIL if the value is passed through with only an 'as PhaseName' cast and no runtime validation.