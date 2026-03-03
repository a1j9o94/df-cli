---
name: auto-redecompose-after-2-failures
type: functional
spec_id: run_01KJSS7KMYARVEC5J0S3BGH46C
created_by: agt_01KJSS7KMZ2V6XM3W4WN6MV62B
---

## Auto-redecompose after 2 failures

### Preconditions
- A run exists with a buildplan containing modules A, B, X where X depends on A and B depends on X
- config.build.max_module_retries = 2 (default)

### Setup
1. Create an in-memory DB with schema
2. Create a run with spec_id and active buildplan with modules: A (completed), B (depends on X), X (depends on A)
3. Create 2 failed builder agents for module X with run_id matching, status='failed', module_id='X'
   - First failed agent: error='Context exhaustion on 600-line file'
   - Second failed agent: error='Context exhaustion on 600-line file'

### Test Steps
1. Call getModuleAttemptCount(db, runId, 'X') — should return 2
2. Verify shouldEscalate(2, config) returns true (count >= threshold)
3. In the build phase, when module X is next to be built:
   - The engine should NOT spawn a regular builder
   - Instead, it should spawn a mini-architect agent (role='architect', name contains 'mini-architect')
4. The mini-architect returns a buildplan patch with sub-modules X1 and X2
5. Verify patchBuildplan() was called and:
   - Module X is removed from the active buildplan
   - Modules X1 and X2 are added
   - plan.modules.length increased by 1 (was 3, now 4)
6. Verify a 'module-redecomposed' event was emitted with data containing oldModuleId='X' and newModuleIds=['X1','X2']
7. Verify the build phase continues and spawns builders for X1 and X2

### Expected Output
- getModuleAttemptCount returns 2
- No builder spawned for module X on 3rd attempt
- Mini-architect spawned instead
- Buildplan updated with X1, X2 replacing X
- Event 'module-redecomposed' emitted
- Builders spawned for X1 and X2

### Pass/Fail Criteria
- PASS: All 7 verification steps succeed
- FAIL: A regular builder is spawned for X when attempt count >= threshold, OR buildplan is not patched, OR event not emitted