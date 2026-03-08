---
name: merge-lock-module-exists-and-is-used
type: change
spec_id: run_01KK74N40R4GGRR0DNE5AA8G2A
created_by: agt_01KK77KMRRRHNXJW1T7AHKMGEP
---

Verify src/pipeline/merge-lock.ts EXISTS and exports acquireMergeLock, releaseMergeLock, waitForMergeLock. It is imported by merge-phase.ts. PASS: File exists with all 3 exports, imported by at least one consumer. FAIL: File missing or not imported.