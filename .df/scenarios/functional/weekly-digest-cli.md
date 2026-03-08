---
name: weekly-digest-cli
type: functional
spec_id: run_01KK7SEAF66NVEXSWY52CHEZ2Q
created_by: agt_01KK7SEAF8R2TQCK3AC2E5ZV0E
---

Setup: Complete 2 specs this week (Spec A with cost $4.23 and 8/8 pass rate, Spec B with cost $1.10 and 5/5 pass rate). Have 1 spec in progress (Spec C, building module 2/4, $3.50 so far). Have 4 draft specs planned across 3 layers.

Steps:
1. Run: dark timeline digest --week

Expected stdout output (markdown format):
- Header: '# Weekly Digest — <current date>'
- '## Completed (2)' section listing both specs with title, completion day, cost, pass rate
- '## In Progress (1)' section with Spec C showing module progress and cost
- '## Planned (4)' section with specs grouped by layer
- Footer: '**Total cost this week: $5.33**' (sum of completed specs only)
- Output is valid markdown with no HTML artifacts

2. Run: dark timeline digest --month

Expected:
- Same format but scoped to current calendar month
- Includes all specs completed this month (may be more than this week)

Pass criteria: CLI outputs clean markdown to stdout with accurate data in all sections.