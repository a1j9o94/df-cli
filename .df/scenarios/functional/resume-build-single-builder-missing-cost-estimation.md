---
name: resume-build-single-builder-missing-cost-estimation
type: functional
spec_id: run_01KJQ3REAY3PPJ95V0NGGPB8WZ
created_by: agt_01KJQFP36EHGHCDAV3C555GN19
---

SCENARIO: When a single-builder run completes via executeResumeBuildPhase, estimateCostIfMissing is not called.

SETUP:
1. Create a run with no buildplan (triggers single-builder fallback)
2. Builder completes with cost_usd = 0 (did not self-report)

STEPS:
1. Call executeResumeBuildPhase with empty previouslyCompletedModules
2. Builder completes successfully
3. Check agent cost_usd after completion

EXPECTED: cost_usd > 0 (estimated from elapsed time)
ACTUAL: cost_usd = 0 (estimateCostIfMissing never called)

PASS: estimateCostIfMissing is called after waitForAgent in single-builder resume path
FAIL: Agent cost_usd remains 0 after completion