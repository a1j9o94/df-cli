---
name: view-config
type: functional
spec_id: run_01KK7R4Y00QTYW313JFYCM7YTJ
created_by: agt_01KK7R4Y02HV5WA517GHC8FYHE
---

PRECONDITION: Dashboard server running, .df/config.yaml exists with known values (e.g., max_parallel=4, budget_usd=50, satisfaction=0.8). STEPS: 1. Open dashboard in browser. 2. Click the Settings tab (gear icon). 3. Verify Build Settings section shows: Default mode dropdown, Max parallel builders=4, Budget cap=50, Max iterations=3. 4. Verify Runtime section shows: Agent binary='claude', Heartbeat timeout=90 (displayed as seconds, stored as 90000ms), Max agent lifetime=45 (minutes, stored as 2700000ms). 5. Verify Thresholds section shows: Satisfaction slider at 0.8, Changeability slider at 0.6. 6. Verify Cost Estimation section shows: Cost per minute, Tokens per minute, Model profile dropdown. 7. Verify Resources section shows: Max worktrees=6, Max API slots=4. PASS CRITERIA: All fields display current config values accurately. Fields matching defaults appear grayed out or marked as 'default'.