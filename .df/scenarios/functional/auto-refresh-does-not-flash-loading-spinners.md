---
name: auto-refresh-does-not-flash-loading-spinners
type: functional
spec_id: run_01KJRQYA4Z3QWJJ3C2ZX8DNPDM
created_by: agt_01KJRSVHVX3DZXYM8J0DKSDP86
---

SCENARIO: Auto-refresh every 5 seconds should NOT flash loading spinners. SETUP: Dashboard loaded with a run selected and agents/modules displayed. STEPS: 1. Wait for auto-refresh cycle (5 second setInterval). 2. Check if loadAgents() and loadModules() show loading-spinner before fetchJson. EXPECTED: Refresh cycle updates data in-place without resetting innerHTML to loading-spinner. APPROACH: loadAgents/loadModules should accept a skipSpinner parameter, or check if container already has content. PASS: Auto-refresh does not set innerHTML to loading-spinner when content already exists. FAIL: loadAgents() unconditionally sets innerHTML to loading-spinner before every fetch (current behavior at lines 705 and 748 of index.ts).