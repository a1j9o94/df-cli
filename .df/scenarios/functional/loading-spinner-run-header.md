---
name: loading-spinner-run-header
type: functional
spec_id: run_01KJRFKRTWVQCMT4QE63HSTTTX
created_by: agt_01KJRK1X97M7RDEHWP0HXZKAT1
---

SCENARIO: Loading spinner appears in run header during data fetch.

PRECONDITIONS:
- Dashboard server is running
- At least one run exists

STEPS:
1. Open dashboard
2. Click a run card in the sidebar
3. Observe the run-header section IMMEDIATELY after clicking

EXPECTED:
- A loading indicator should be visible in the run-header div before run detail data arrives
- The loading indicator should be consistent with agents/modules spinners (uses .loading-spinner class)
- After data loads, the loading indicator is replaced with run stats

VERIFICATION:
- loadRunDetail() should set a loading state before calling fetchJson
- The run-header div should show a spinner or skeleton before data arrives
- After success, renderRunHeader replaces the content

EDGE CASE FOUND IN run_01KJRFKRTWVQCMT4QE63HSTTTX:
loadAgents() and loadModules() both show loading spinners before fetch, but loadRunDetail() does NOT.
The run-header simply goes blank or keeps stale content until the fetch completes. This is inconsistent.