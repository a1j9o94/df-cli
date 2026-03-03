---
name: auto-refresh-suppresses-loading-spinner
type: functional
spec_id: run_01KJRFKRTWVQCMT4QE63HSTTTX
created_by: agt_01KJRK1X97M7RDEHWP0HXZKAT1
---

SCENARIO: Auto-refresh does NOT flash loading spinners.

PRECONDITIONS:
- Dashboard server is running
- A run is selected and agents/modules are already displayed

STEPS:
1. Wait for auto-refresh cycle (setInterval every 5 seconds)
2. Observe the agents panel and modules panel during auto-refresh

EXPECTED:
- Auto-refresh calls loadAgents() and loadModules() without showing a loading spinner
- Content updates in-place (new data replaces old data directly)
- Loading spinners only appear on INITIAL load or when switching runs — NOT on periodic refreshes
- The refresh() function either calls a separate non-spinner fetch path, or loadAgents/loadModules accept a parameter to suppress spinner on refresh

VERIFICATION:
- Test: The refresh() function does NOT cause loading-spinner elements to appear briefly
- The JS distinguishes between initial load (show spinner) and auto-refresh (update in-place)
- One of these approaches should be used:
  a) loadAgents/loadModules accept a skipSpinner parameter
  b) refresh() calls separate functions that skip the spinner
  c) The spinner is only shown if the container has no existing content

BUG FOUND IN ITERATION run_01KJRFKRTWVQCMT4QE63HSTTTX:
The loadAgents() and loadModules() functions unconditionally set innerHTML to loading-spinner before EVERY fetch, including auto-refresh cycles. This causes a visible flash every 5 seconds.