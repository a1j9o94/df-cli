---
name: event-type-includes-budget-warning
type: functional
spec_id: run_01KK6J195CBPQR35EVQ13YJ2J1
created_by: agt_01KK6NAS866F1QEQB6P8KAEVPW
---

SETUP: Read src/types/event.ts. STEPS: 1. Check EventType union for 'budget-warning' literal. 2. Check EventType union for 'run-paused' literal. EXPECTED: Both 'budget-warning' and 'run-paused' appear in the EventType union. PASS CRITERIA: Both event types present. FAIL if either is missing from EventType.