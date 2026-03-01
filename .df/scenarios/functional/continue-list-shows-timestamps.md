---
name: continue-list-shows-timestamps
type: functional
spec_id: run_01KJN8QXTC1J67B6B9BW3R4M41
created_by: agt_01KJNC56310SNWYZW3XKQ6DJX9
---

SCENARIO: When multiple resumable runs are listed, each entry must include created_at timestamp

PRECONDITIONS:
- Two or more failed runs exist in DB

STEPS:
1. Run: dark continue (no args)
2. Observe the output for each listed run

EXPECTED:
- Each run entry includes the created_at timestamp alongside ID, spec, status, and phase
- Example: 'run_abc123  spec=spec01  status=failed  phase=build  created=2026-03-01T10:00:00Z'

PASS CRITERIA:
- Each run in the listing includes a timestamp or datetime string
- FAIL if only ID, spec, status, and phase are shown without time
- Current code at continue.ts line ~52 outputs: id, spec_id, status, current_phase, error — but NOT created_at
- Users need timestamps to identify which run to resume when multiple failed runs exist