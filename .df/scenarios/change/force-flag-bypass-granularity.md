---
name: force-flag-bypass-granularity
type: change
spec_id: run_01KJSRR01K5PXP0JVNMG3RYM19
created_by: agt_01KJT3FJ21XE3DSRTB8EDM5P27
---

Changeability test: The --force flag currently bypasses the content hash check but NOT the status check. Adding a --force-status flag that also bypasses the status check should be a small change. VERIFICATION: 1. preBuildValidation() in build-guards.ts has separate Guard 1 (status) and Guard 2 (hash) sections. 2. Guard 2 already checks the 'force' boolean parameter. 3. Adding force-status: add a new boolean parameter, wrap Guard 1 in if(\!forceStatus). 4. Update build.ts to add --force-status CLI option. PASS CRITERIA: Adding granular force flags requires ~5 lines in build-guards.ts and ~3 lines in build.ts. No engine changes needed. FAIL CRITERIA: The force logic is entangled with other validation, making granular bypass difficult.