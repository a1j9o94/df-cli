---
name: add-dark-build-suggestion-to-continue
type: change
spec_id: run_01KJN8ZVVNXJJARY00TM2GX6X5
created_by: agt_01KJNC3VME1YR7HSH2CQYPM6EX
---

CHANGEABILITY SCENARIO: Add 'dark build' suggestion when no resumable runs exist

DESCRIPTION:
When dark continue finds no resumable runs, it says 'No resumable runs found. There are no failed or stale runs.' but does not suggest running 'dark build' as an alternative. A fresh builder should add this suggestion.

MODIFICATION STEPS:
1. In src/commands/continue.ts line 39, append suggestion text
2. Change message to: 'No resumable runs found. Start a new pipeline with: dark build <spec-id>'

AFFECTED AREAS:
- src/commands/continue.ts — 1 string change (~1 line)

EXPECTED EFFORT:
- 1 line changed in 1 file

VERIFICATION:
1. Run dark continue with no failed runs
2. Output includes 'dark build' in the error message
3. Exit code still non-zero

PASS CRITERIA:
- Error message mentions 'dark build'
- Only continue.ts modified
- Exit behavior unchanged (still exits with code 1)