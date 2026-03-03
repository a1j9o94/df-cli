---
name: continue-does-not-validate-paused-runs
type: change
spec_id: run_01KJSS7KPSXHDFWHRE2S286JK5
created_by: agt_01KJT3FJ5RPKEH10EDA42DS0H9
---

CHANGEABILITY SCENARIO: src/commands/continue.ts does not check for run status 'paused' before proceeding. The spec requires that 'dark continue' on a paused run should say 'Run is paused, not failed. Use dark resume instead.' Currently, continue.ts only validates that run.status is 'failed' or 'running'. A paused run could be improperly continued instead of resumed. VERIFICATION: 1. Read continue.ts line 64 — only checks for failed/running. 2. No mention of 'paused' status in continue.ts. 3. getResumableRuns() does not filter out paused runs. PASS CRITERIA: PASS if continue.ts rejects paused runs with a helpful message. FAIL if paused runs slip through.