---
name: run-paused-event-type-must-exist
type: functional
spec_id: run_01KJSS7KPSXHDFWHRE2S286JK5
created_by: agt_01KJSW9NVMB0Y8KQZK63QQSPKS
---

SCENARIO: EventType must include run-paused for the pause command to emit events.
STEPS: 1. Read src/types/event.ts. 2. Check EventType union.
EXPECTED: EventType includes 'run-paused'.
PASS CRITERIA: 'run-paused' appears in EventType union. FAIL if only run-created, run-started, run-completed, run-failed, run-resumed, run-cancelled exist without run-paused.
