---
name: completed-spec-pass-rate-indicator
type: functional
spec_id: run_01KK6D0A338WWPKA9YNGG3S1WB
created_by: agt_01KK6FGNRKS4HTSNQRXAPQPKT1
---

SCENARIO: Completed spec shows pass rate indicator in sidebar
PRECONDITIONS: A spec exists with status 'completed' and a completed run with scenario results.
STEPS:
1. Open dashboard
2. Look at the completed spec card in the sidebar
EXPECTED RESULTS:
- The completed spec card shows the most recent run's pass rate as a small indicator (e.g., '6/6 passed' or '100%')
- GET /api/specs endpoint returns pass rate data for completed specs
- The sidebar rendering code renders the pass rate on completed spec cards
PASS CRITERIA: Pass rate indicator visible on completed spec cards in sidebar
CURRENT STATUS: NOT IMPLEMENTED - spec cards only show status badge and last modified date. No pass rate data in API or UI.