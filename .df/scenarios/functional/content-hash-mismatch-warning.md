---
name: content-hash-mismatch-warning
type: functional
spec_id: run_01KJSRR01K5PXP0JVNMG3RYM19
created_by: agt_01KJSRR01N81B9Y97S0PMHKWX1
---

Precondition: A spec exists with status 'draft'. A previous build run exists for this spec (so content_hash is stored in DB). Steps: 1) Create a spec and run a build (or manually set content_hash in the specs table). Let the build complete or fail so spec returns to 'draft'. 2) Edit the spec file on disk (change any content in the body). 3) Run 'dark build <spec-id>'. Expected: Command outputs a warning message containing: 'Warning: spec file has been modified since the last build.' and mentions the original run ID, and suggests 'dark spec create' or 'dark build --force'. Command does NOT proceed with the build (exits non-zero or prompts). 4) Verify no new run was created. Pass criteria: Warning message displayed with correct run reference. Build does not proceed without --force.