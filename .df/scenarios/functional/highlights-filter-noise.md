---
name: highlights-filter-noise
type: functional
spec_id: run_01KJSYMVTRZA22SC742GEMEWDJ
created_by: agt_01KJSYMVTT7H090YHJERTJN6FG
---

## Highlights Filter Noise

### Preconditions
- A completed run with agent logs containing mixed content:
  - Structured events (module_created, scenario_passed/failed, key decisions)
  - Raw Claude reasoning text (thinking, chain of thought)
  - Token count summaries (cost_usd, tokens_used fields)
  - Internal agent coordination messages (mail check, heartbeat)
  - Tool use events (Bash, Read, Write calls)

### Test Steps
1. Read .df/runs/<run-id>/highlights.json
2. Parse each entry and verify its type field
3. Verify ONLY these types appear: module_created, scenario_passed, scenario_failed, key_decision, error_recovery, integration
4. Verify NO entries contain:
   - Raw Claude reasoning or chain-of-thought text
   - Token count or cost information
   - Internal agent coordination (mail check, heartbeat, agent complete)
   - Tool input/output dumps
5. Check GET /api/runs/<run-id>/highlights returns the same filtered set
6. Verify each highlight has: type, description, timestamp fields
7. Verify descriptions are human-readable summaries, not raw log lines

### Pass Criteria
- highlights.json contains ONLY the 6 allowed event types
- Zero entries with raw reasoning, token counts, or coordination messages
- Each entry has type, description, and timestamp
- API endpoint returns the same data as the file