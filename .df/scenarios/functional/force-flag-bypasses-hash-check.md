---
name: force-flag-bypasses-hash-check
type: functional
spec_id: run_01KJSRR01K5PXP0JVNMG3RYM19
created_by: agt_01KJSRR01N81B9Y97S0PMHKWX1
---

Precondition: A spec exists with status 'draft'. content_hash in DB is stale (spec file was edited after last build). Steps: 1) Set up a spec with a known content_hash mismatch (edit spec file after build). 2) Run 'dark build <spec-id> --force'. Expected: No hash mismatch warning is displayed. Build proceeds normally (engine.execute is called, run is created). 3) Verify a new run record exists in the runs table. Pass criteria: --force bypasses the content hash check entirely. Build starts without warning.