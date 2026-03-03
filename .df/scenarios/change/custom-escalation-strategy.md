---
name: custom-escalation-strategy
type: change
spec_id: run_01KJSS7KMYARVEC5J0S3BGH46C
created_by: agt_01KJSS7KMZ2V6XM3W4WN6MV62B
---

## Custom escalation strategy (changeability)

### Modification Description
Replace the default escalation handler (spawn mini-architect to re-decompose) with an alternative: 'ask the user via CLI prompt to manually split the module'. This tests that the escalation strategy is pluggable without affecting failure detection or buildplan patching.

### Affected Areas
1. src/pipeline/escalation.ts — The escalation handler function is the ONLY file that needs to change
2. src/pipeline/failure-tracking.ts — Should NOT need any changes (failure detection is independent)
3. src/pipeline/buildplan-patch.ts — Should NOT need any changes (patching logic is independent)
4. src/pipeline/build-phase.ts — Should NOT need changes IF escalation handler has the same interface

### Expected Effort
- Change: Create a new escalation handler function with same signature as the default (accepts db, runtime, config, runId, moduleId, worktreePath; returns Promise<ModuleDefinition[]>)
- The new handler would prompt the user interactively instead of spawning a mini-architect
- Swap the handler in build-phase.ts by changing the import or passing it as a parameter
- Estimated: 1-2 files changed, <50 lines total
- Zero changes to failure-tracking.ts or buildplan-patch.ts

### Pass/Fail Criteria
- PASS: The escalation handler can be replaced by implementing a new function with the same interface type, and the failure detection + buildplan patching modules require zero changes
- FAIL: Changing the escalation strategy requires modifying failure detection logic, buildplan patching logic, or more than 2 files