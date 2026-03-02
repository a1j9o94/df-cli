---
name: status-module-progress
type: functional
spec_id: run_01KJQERB5P8DCWZJXCZR5Z64BW
created_by: agt_01KJQERB5RN11QM94PWHDCE5WH
---

SCENARIO: 'dark status' shows per-module build progress inline.

SETUP:
1. Initialize dark factory project  
2. Start a build with a buildplan that has 3+ modules
3. Have at least one builder completed, one building, and one pending

TEST STEPS:
1. Run 'dark status' during the build phase
2. Examine output for module progress information

EXPECTED OUTPUT:
In the run summary or detail view:
  modules: merge-lock(done) engine-rebase(building 12m) queue-vis(pending)

Or in the detailed single-run view:
  Modules:
    merge-lock      done        builder-1    5m 23s    2 files
    engine-rebase   building    builder-2    12m 01s   1 file
    queue-vis       pending     —            —         —

PASS CRITERIA:
- Per-module status is visible in dark status output
- Each module shows: module_id, status (done/building/pending), and optionally elapsed time
- Module status is derived from the associated builder agent status:
  - Agent completed → module 'done'
  - Agent running → module 'building' + elapsed time
  - No agent assigned yet → module 'pending'
- Modules are listed from the active buildplan
- Works in both summary and --run-id detail modes
- Active agent count is clarified: e.g., '2 active, 1 completed, 2 dead' instead of just '2/5'

FAIL CRITERIA:
- No per-module progress shown
- Module status doesn't reflect actual agent status
- Only shows 'agents=2/5' without breakdown