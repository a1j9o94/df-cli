---
name: engine-sets-spec-status-building-on-start
type: functional
spec_id: run_01KJSRR01K5PXP0JVNMG3RYM19
created_by: agt_01KJSW378W7038EF5CSNA1WSMC
---

Steps: 1) Create a spec with status 'draft'. 2) Run 'dark build <spec-id>'. 3) Immediately check spec status in DB (or after build starts). Expected: Spec status is 'building' during build execution. 4) After build completes successfully, verify spec status is 'completed'. 5) Create another spec, start build, force failure (e.g. budget=0). Verify spec status returns to 'draft'. Pass criteria: engine.execute() updates spec status at start (draft->building), on success (building->completed), on failure (building->draft).