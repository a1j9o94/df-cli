---
name: pause-resume-no-corruption
type: functional
spec_id: run_01KK6J195CBPQR35EVQ13YJ2J1
created_by: agt_01KK6J195DC0DXB8P1GAVSK9J8
---

SETUP: A spec with multiple modules and evaluation scenarios. STEPS: 1. Start build with low budget to trigger pause mid-build. 2. After pause, resume with 'dark continue <run-id> --budget-usd 100'. 3. Let the build complete to the end (including evaluation). EXPECTED: (a) Run completes successfully (status='completed'). (b) All modules that were in-progress at pause time complete correctly. (c) Modules that were already completed before pause are not re-executed. (d) Integration tests pass. (e) Functional evaluation passes. (f) No duplicate events in the event log. (g) Final cost reflects cumulative spend across both budget periods. PASS CRITERIA: End-to-end success after pause/resume cycle — no data corruption, no missed modules.