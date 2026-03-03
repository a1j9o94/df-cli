---
name: sub-modules-inherit-dependencies
type: functional
spec_id: run_01KJSS7KMYARVEC5J0S3BGH46C
created_by: agt_01KJSS7KMZ2V6XM3W4WN6MV62B
---

## Sub-modules inherit dependencies

### Preconditions
- Active buildplan with modules: A, X, B
- Dependencies: X depends on A (from: 'X', to: 'A', type: 'completion'), B depends on X (from: 'B', to: 'X', type: 'completion')
- Module A is completed. Module X has failed 2+ times.

### Setup
1. Create in-memory DB with schema
2. Create run, spec, and active buildplan with:
   - modules: [{id:'A',...}, {id:'X',...}, {id:'B',...}]
   - dependencies: [{from:'X',to:'A',type:'completion'}, {from:'B',to:'X',type:'completion'}]
3. Mark module A as completed (create completed builder agent)
4. Create 2 failed builder agents for module X

### Test Steps
1. Call patchBuildplan(db, runId, specId, 'X', [X1_def, X2_def]) where X1_def and X2_def are ModuleDefinition objects for sub-modules X1 and X2
2. Read the updated buildplan from DB via getActiveBuildplan(db, specId)
3. Parse the plan JSON and verify:
   a. Module X is NOT in plan.modules
   b. Modules X1 and X2 ARE in plan.modules
   c. Dependencies include: {from:'X1', to:'A', type:'completion'} — X1 inherits X's dependency on A
   d. Dependencies include: {from:'X2', to:'A', type:'completion'} — X2 inherits X's dependency on A
   e. Dependencies include: {from:'B', to:'X1', type:'completion'} — B now depends on X1
   f. Dependencies include: {from:'B', to:'X2', type:'completion'} — B now depends on X2
   g. The old dependency {from:'X', to:'A'} is REMOVED
   h. The old dependency {from:'B', to:'X'} is REMOVED

### Expected Output
- Updated buildplan has 4 modules: A, X1, X2, B
- 4 new dependencies replace the 2 old ones
- No references to module X remain in dependencies

### Pass/Fail Criteria
- PASS: All dependency rewiring checks (3a-3h) pass
- FAIL: Any old dependency referencing X remains, OR any sub-module missing inherited dependency, OR B does not depend on ALL sub-modules