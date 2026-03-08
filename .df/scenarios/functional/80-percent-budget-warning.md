---
name: 80-percent-budget-warning
type: functional
spec_id: run_01KK6J195CBPQR35EVQ13YJ2J1
created_by: agt_01KK6J195DC0DXB8P1GAVSK9J8
---

SETUP: Start a build with --budget-usd 10 that will cost more than $8 but the full build should exceed $10. STEPS: 1. Run 'dark build <spec-id> --budget-usd 10'. 2. Monitor console output as cost increases. EXPECTED: (a) When cost crosses ~$8 (80% of $10), a warning is logged: 'Budget warning: $X.XX of $10.00 spent (80%). Build will pause at $10.00.' (b) The warning appears exactly ONCE (not repeated on subsequent heartbeats). (c) A 'budget-warning' event is created in the events table. (d) The build CONTINUES past the warning — it does NOT pause at 80%. (e) Build only pauses when cost reaches ~$10 (100%). PASS CRITERIA: Warning logged once at 80%, build continues, pauses at 100%.