---
name: resume-rejects-failed-runs
type: functional
spec_id: run_01KJSS7KPSXHDFWHRE2S286JK5
created_by: agt_01KJSS7KPV70WHZAJMQ3TAZSBY
---

SETUP: Start a build. Have a builder fail (dark agent fail {agentId}). Verify run.status === 'failed'. ACTIONS: (1) Run dark resume {runId}. EXPECTED: Command exits with an error message. The run is NOT resumed. PASS CRITERIA: (a) dark resume exits with non-zero exit code. (b) Error message contains: 'Run failed. Use dark continue for failed runs.' (or semantically equivalent). (c) Run status remains 'failed' (unchanged). (d) No new agents are spawned. (e) No run-resumed event is created.