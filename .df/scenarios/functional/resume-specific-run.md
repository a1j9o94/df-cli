---
name: resume-specific-run
type: functional
spec_id: run_01KJSS7KPSXHDFWHRE2S286JK5
created_by: agt_01KJSS7KPV70WHZAJMQ3TAZSBY
---

SETUP: Start 2 builds (runA, runB). Pause both via dark pause. Verify both are status 'paused'. ACTIONS: (1) Run dark resume {runA_id}. EXPECTED: Only runA is resumed. runB stays paused. PASS CRITERIA: (a) runA.status === 'running' after resume. (b) runB.status === 'paused' (unchanged). (c) runA's paused agents get new replacement agents spawned. (d) runB's agents remain in status 'paused'. (e) run-resumed event created only for runA.