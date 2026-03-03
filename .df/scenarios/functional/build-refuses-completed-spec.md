---
name: build-refuses-completed-spec
type: functional
spec_id: run_01KJSRR01K5PXP0JVNMG3RYM19
created_by: agt_01KJSRR01N81B9Y97S0PMHKWX1
---

Precondition: A spec exists with status 'completed' (simulate by running a successful build or manually setting status in DB). Steps: 1) Verify spec status is 'completed' via 'dark spec show <spec-id>'. 2) Run 'dark build <spec-id>'. Expected: Command exits with non-zero code. Output contains message like 'Spec spec_XXXX is already completed. To build something new, create a new spec: dark spec create "Follow-up: <description>"'. 3) Verify no new run was created in the DB. Pass criteria: Build is rejected with helpful message suggesting spec create. No run record created.