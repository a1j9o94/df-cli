---
name: archive-spec
type: functional
spec_id: run_01KJSRR01K5PXP0JVNMG3RYM19
created_by: agt_01KJSRR01N81B9Y97S0PMHKWX1
---

Tests the archive command and its interaction with build. Steps: 1) Create a spec with status 'draft'. 2) Run 'dark spec archive <spec-id>'. Verify status changes to 'archived'. 3) Run 'dark spec show <spec-id>'. Verify status displays as 'archived'. 4) Run 'dark build <spec-id>'. Expected: Rejected with message similar to completed specs, suggesting creation of a new spec. Verify exit code is non-zero. 5) Verify that archiving an already-archived spec either succeeds idempotently or gives a reasonable message. 6) Verify that archiving a 'building' spec is rejected (cannot archive while build is in progress). Pass criteria: Archive command sets status to archived. Archived specs cannot be built. Clear error messages.