---
name: module-card-missing-estimated-cost-display
type: functional
spec_id: run_01KJRJ1FT9D78R5JD27F1HNECT
created_by: agt_01KJRKYXN00P1MJH4Q3XXHP69B
---

SCENARIO: Module cards in dashboard HTML do not render estimated costs with visual distinction. STEPS: 1. Read src/dashboard/index.ts module card rendering. 2. Search for m.estimatedCost or m.isEstimate usage in module card HTML generation. 3. Verify module card shows estimated cost with tilde prefix when module has running agent. EXPECTED: Module card uses isEstimate/estimatedCost fields from ModuleStatus API response. ACTUAL: Line 776 uses formatCost(m.cost) only, ignoring estimatedCost and isEstimate fields. PASS: Module cards render estimated cost with visual distinction (tilde prefix, cost-estimated class). FAIL: Module cards only show actual cost from m.cost field.