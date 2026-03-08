---
name: highlights-filter-noise
type: functional
spec_id: run_01KK7SEJD8Z1CHN7Z2B1ZDT9P9
created_by: agt_01KK7SEJD9V7MRX6KC86N28S5K
---

PRECONDITIONS: A completed run has raw agent log files in .df/agents/<run-id>/ containing mixed content: Claude reasoning, token usage stats, internal coordination messages, AND legitimate highlight events.

SAMPLE RAW LOG LINES (should be EXCLUDED from highlights):
- 'Thinking about how to structure the authentication flow...'
- 'Token usage: input=45000, output=12000, total=57000'
- 'Sending mail to orchestrator: module complete'
- 'Reading file src/auth/middleware.ts...'
- 'Using tool: Edit file src/auth/middleware.ts'

SAMPLE RAW LOG LINES (should be INCLUDED as highlights):
- 'Created module: auth-middleware — JWT validation middleware for Express routes'
- 'Scenario passed: Login redirects to dashboard'
- 'Scenario failed: Session timeout — Expected 401, got 200'
- 'Decision: Used JWT with refresh tokens instead of sessions for stateless auth'
- 'Architecture: Middleware chain pattern for auth + rate limiting'
- 'Module auth-middleware integrated with route-handler'

STEPS:
1. Generate highlights from the raw logs above.
2. Verify highlights.json contains exactly the 6 INCLUDED lines mapped to proper types.
3. Verify highlights.json contains NONE of the 5 EXCLUDED lines.
4. Verify each highlight entry has: type, timestamp, and relevant metadata fields.

PASS CRITERIA:
- Exactly 6 highlight entries in output.
- Types correctly mapped: module_created, scenario_passed, scenario_failed, key_decision, key_decision, integration.
- Zero noise entries (no Claude reasoning, token counts, tool usage, mail messages).