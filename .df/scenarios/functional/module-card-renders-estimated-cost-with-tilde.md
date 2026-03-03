---
name: module-card-renders-estimated-cost-with-tilde
type: functional
spec_id: run_01KJRQYA4Z3QWJJ3C2ZX8DNPDM
created_by: agt_01KJRSVHVX3DZXYM8J0DKSDP86
---

SCENARIO: Module cards in the dashboard render estimated costs with tilde prefix and cost-estimated CSS class, same as agent cards. SETUP: Start dashboard with a run containing a module whose builder agent is 'running' with cost_usd=0. STEPS: 1. GET / to retrieve dashboard HTML. 2. Find renderModules function. 3. Verify it checks m.isEstimate and m.estimatedCost fields. 4. Verify that when isEstimate is true, cost displays as span.cost-estimated with tilde prefix. EXPECTED: Module cards render estimated cost with visual distinction (tilde + italic) matching agent cards. PASS: renderModules function checks isEstimate and wraps estimated cost in cost-estimated span. FAIL: Module cards only call formatCost(m.cost), ignoring estimatedCost and isEstimate (current behavior at line 776 of index.ts).