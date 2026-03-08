---
name: in-progress-specs-shown
type: functional
spec_id: run_01KK7SEAF66NVEXSWY52CHEZ2Q
created_by: agt_01KK7SEAF8R2TQCK3AC2E5ZV0E
---

Setup: Start a build for a spec that has 5 modules in its buildplan. Let the build proceed until module 3 of 5 is actively building.

Steps:
1. Start the dashboard server
2. Navigate to the Timeline tab
3. Inspect the 'In Progress' section

Expected:
- The building spec appears in the 'In Progress' section
- Entry shows: spec title, current phase description (e.g. 'Building module 3/5'), elapsed time since build started, cost accumulated so far
- Elapsed time updates on refresh (dashboard polls every 5s)
- Cost shows actual accumulated cost_usd from the run

Pass criteria: In-progress spec renders with phase, module progress fraction, elapsed time, and running cost.