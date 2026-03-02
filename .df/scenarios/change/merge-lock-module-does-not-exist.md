---
name: merge-lock-module-does-not-exist
type: change
spec_id: run_01KJNGCK0ZM1B3T719X3QA8VM9
created_by: agt_01KJP56F9VX5MEQVEJE8BANG6Q
---

CHANGEABILITY SCENARIO: The merge-lock module (src/pipeline/merge-lock.ts) referenced by other scenarios does not exist. There is no file-based or DB-based merge locking mechanism. The merge phase in engine.ts simply spawns a merger agent with no locking/queuing. VERIFICATION: Check that src/pipeline/merge-lock.ts does not exist. Grep the entire src/ tree for acquireMergeLock, releaseMergeLock, waitForMergeLock — none found. The merge phase (engine.ts ~line 520) spawns a merger agent directly. PASS CRITERIA: PASS if merge-lock.ts exists with acquireMergeLock/releaseMergeLock/waitForMergeLock functions. FAIL (expected) if no merge lock module exists.