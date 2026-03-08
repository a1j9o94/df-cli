---
name: schema-missing-paused-at-column
type: functional
spec_id: run_01KK6J195CBPQR35EVQ13YJ2J1
created_by: agt_01KK6NAS866F1QEQB6P8KAEVPW
---

SETUP: Read src/db/schema.ts. STEPS: 1. Check the runs table CREATE statement for paused_at TEXT column. 2. Check for pause_reason TEXT column. EXPECTED: Both columns exist in the runs table schema. PASS CRITERIA: paused_at and pause_reason columns present in schema.ts runs table definition. FAIL if either column is missing.