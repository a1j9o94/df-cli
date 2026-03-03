---
name: swarm-dry-run
type: functional
spec_id: run_01KJT1DSC7RYMZBNXACN9871DA
created_by: agt_01KJT1DSC9A3PD8YJAG21ECY1N
---

SCENARIO: Swarm dry-run shows plan without executing
PRECONDITIONS:
- Dark Factory project initialized
- spec_A (no deps), spec_B (depends on A), spec_C (no deps) exist, all draft
STEPS:
1. Run: dark swarm --dry-run
EXPECTED:
- Output shows execution plan grouped by layers:
  Layer 0: spec_A, spec_C (both have no deps — can build in parallel)
  Layer 1: spec_B (depends on spec_A)
- No runs are created in the runs table
- No agents are spawned
- No files are modified in the working tree
- Command exits with code 0
VALIDATION:
- Query runs table: no new rows created
- Query agents table: no new rows created
- Output contains layer/group information with spec IDs
PASS CRITERIA: Plan displayed correctly, zero side effects on database or filesystem.