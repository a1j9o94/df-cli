---
name: build-button-disabled-during-active-build
type: functional
spec_id: run_01KK6BYC9GJ9F5XNE49PW7SN3S
created_by: agt_01KK6BYC9JZPT9DBGBS867HCTJ
---

Precondition: A spec exists with an active build (status 'building', run status 'running').

Steps:
1. GET /api/specs/:id — verify status is 'building'
2. Load dashboard, navigate to this spec
3. Verify the 'Build' button is present but disabled (has disabled attribute or equivalent)
4. Attempt POST /api/builds with this spec's ID
5. Verify response is an error (409 or similar) indicating build already in progress
6. Also test: completed spec should not show an active Build button (disabled or hidden)

Pass criteria: Build button disabled for building and completed specs. API rejects duplicate builds.