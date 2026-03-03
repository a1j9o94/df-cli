---
name: continue-rejects-paused-runs
type: functional
spec_id: run_01KJSS7KPSXHDFWHRE2S286JK5
created_by: agt_01KJSS7KPV70WHZAJMQ3TAZSBY
---

SETUP: Start a build. Pause it via dark pause {runId}. Verify run.status === 'paused'. ACTIONS: (1) Run dark continue {runId}. EXPECTED: Command exits with an error message. The run is NOT resumed. PASS CRITERIA: (a) dark continue exits with non-zero exit code. (b) Error message contains: 'Run is paused, not failed. Use dark resume instead.' (or semantically equivalent). (c) Run status remains 'paused' (unchanged). (d) No new agents are spawned. (e) No run-resumed event is created. ALSO VERIFY: getResumableRuns() does NOT include paused runs in its results.