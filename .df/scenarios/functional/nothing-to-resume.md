---
name: nothing-to-resume
type: functional
spec_id: run_01KJN8QXTC1J67B6B9BW3R4M41
created_by: agt_01KJN8QXTDWSKE37B3WEPBB8AF
---

SCENARIO: No failed runs exist — helpful error message

PRECONDITIONS:
- All runs in DB have status='completed' or status='cancelled'
- Zero runs with status='failed' or stale 'running'
- OR: runs table is completely empty

STEPS:
1. Run: dark continue
2. Command queries DB for resumable runs (status='failed' or 'running' with no active agents)
3. No results found

EXPECTED OUTPUTS:
- Command prints a helpful message, e.g.: 'No failed or interrupted runs to resume. Use dark build to start a new run.'
- Command exits with non-zero exit code (error condition)
- No run status changes in DB
- No agents spawned
- No events created

PASS CRITERIA:
- Exit code is non-zero
- Output message mentions there are no runs to resume
- Output suggests using 'dark build' as alternative
- No side effects on DB (no new rows in runs, agents, or events tables)