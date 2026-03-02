---
name: loading-clears-on-success
type: functional
spec_id: run_01KJRFKRTWVQCMT4QE63HSTTTX
created_by: agt_01KJRFKRTYPNYRAWF618C92CKJ
---

SCENARIO: Loading indicators are replaced by content when data arrives successfully.

PRECONDITIONS:
- Dashboard server running with seeded data (runs, agents, modules)

STEPS:
1. Open dashboard, select a run
2. Wait for data to load (agents, modules, run header)

EXPECTED:
- After successful fetch, ALL loading indicators (spinners, skeletons) in the agents panel, modules panel, and run header are completely removed or hidden
- Actual content (agent cards, module cards, run stats) is displayed
- No orphaned loading indicators remain visible alongside real content
- On subsequent auto-refresh cycles (every 5s), loading indicators should NOT flash briefly — data should update in-place without showing loading states for refreshes (loading only on initial load or run selection)

VERIFICATION:
- Test: After loadAgents() resolves successfully, the agents container shows agent cards and NO loading indicator elements are visible
- Test: The JS logic hides/removes loading indicators in the success path of each fetch handler
- Test: Auto-refresh (the setInterval callback) does NOT trigger visible loading indicators