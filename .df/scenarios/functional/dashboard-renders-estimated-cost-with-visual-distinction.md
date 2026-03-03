---
name: dashboard-renders-estimated-cost-with-visual-distinction
type: functional
spec_id: run_01KJRQYA4Z3QWJJ3C2ZX8DNPDM
created_by: agt_01KJRQYA51CTFPABVKCPBNET3C
---

SETUP: Start dashboard server and open the dashboard HTML page. Create a run with 1 running agent (cost_usd=0, created_at=2min ago) and 1 completed agent (cost_usd=0.75). STEPS: 1. Load dashboard at /. 2. Select the run. 3. Inspect the Agents tab HTML. EXPECTED: The running agent cost display uses the CSS class cost-estimated (italic styling) and shows a tilde prefix (~) before the estimated cost. The completed agent shows actual cost without italic/tilde. The run header Cost stat includes both actual and estimated portions. PASS CRITERIA: Running agent card contains span.cost-estimated with ~ prefix. Completed agent card shows plain cost without cost-estimated class. Run header shows cost + estimated cost format.