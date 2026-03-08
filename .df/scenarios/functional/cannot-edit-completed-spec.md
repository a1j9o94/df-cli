---
name: cannot-edit-completed-spec
type: functional
spec_id: run_01KK6BYC9GJ9F5XNE49PW7SN3S
created_by: agt_01KK6BYC9JZPT9DBGBS867HCTJ
---

Precondition: A spec exists with status 'completed' (has at least one run where all scenarios passed). Its id is known.

Steps:
1. GET /api/specs/:id — verify status is completed
2. Send PUT /api/specs/:id with body: {"content": "<any modified content>"}
3. Verify response status is 403 or 409 (not 200)
4. Verify response body contains an error message indicating the spec is locked/immutable
5. Read the file on disk and verify it has NOT been modified (content unchanged)
6. In the dashboard HTML (GET /), verify the UI includes:
   a. A 'Locked' badge or indicator on completed specs
   b. Editor fields are non-editable (readonly/disabled attributes)
   c. Explanation text about creating a new spec to make changes

Pass criteria: PUT rejected with appropriate error. File unchanged. UI shows locked state.