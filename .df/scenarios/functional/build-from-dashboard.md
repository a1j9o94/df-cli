---
name: build-from-dashboard
type: functional
spec_id: run_01KK6BYC9GJ9F5XNE49PW7SN3S
created_by: agt_01KK6BYC9JZPT9DBGBS867HCTJ
---

Precondition: A draft spec exists with known id. No active builds running for this spec.

Steps:
1. Send POST /api/builds with body: {"specId": "<spec-id>"}
2. Verify response status 200/201 with JSON containing: runId (string), specId (matching input)
3. Query the runs table in the database and verify a new run exists with:
   a. spec_id matching the spec
   b. status is 'pending' or 'running'
4. GET /api/specs/:id/runs and verify the new run appears in the list
5. Verify the spec status in the database has transitioned (e.g., to 'building')

Error case:
6. Send POST /api/builds again for the same spec while build is active
7. Verify response indicates build already in progress (status 409 or error message)
8. Verify no duplicate run was created

Pass criteria: Build starts successfully. Run record created. Duplicate build rejected.