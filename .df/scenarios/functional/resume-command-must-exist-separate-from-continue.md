---
name: resume-command-must-exist-separate-from-continue
type: functional
spec_id: run_01KJSS7KPSXHDFWHRE2S286JK5
created_by: agt_01KJSW9NVMB0Y8KQZK63QQSPKS
---

SCENARIO: dark resume command must exist as a separate CLI command from dark continue.
STEPS: 1. Check that src/commands/resume.ts exists. 2. Check that src/index.ts imports and registers resumeCommand. 3. Verify it only accepts paused runs (not failed). 4. Verify it reuses worktrees for paused builders but spawns fresh for non-builder agents.
EXPECTED: resume.ts exists and is distinct from continue.ts. It handles paused runs, not failed.
PASS CRITERIA: File exists, is imported, handles only paused runs. FAIL if resume command does not exist or is conflated with continue.
