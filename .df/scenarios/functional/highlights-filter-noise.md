---
name: highlights-filter-noise
type: functional
spec_id: run_01KK7R4Y1NWJRH426C68FK58CZ
created_by: agt_01KK7R4Y1TEX0SQCM76106T1F2
---

Preconditions: A completed run with agent logs in .df/logs/<agent-id>.jsonl containing a mix of: (a) highlight-worthy events (module creation, test results, decisions), and (b) noise (raw Claude reasoning, token counts, internal agent coordination messages, tool call details).

Steps:
1. Read raw agent log JSONL and confirm it contains both signal and noise
2. Read .df/runs/<run-id>/highlights.json
3. Verify highlights ONLY contain these event types: module_created, scenario_passed, scenario_failed, key_decision, error_recovery, integration
4. Verify highlights do NOT contain:
   - Raw Claude reasoning or thinking text
   - Token count summaries
   - Internal agent coordination (mail send/check commands)
   - Tool call input/output details
   - Cost calculations
   - Heartbeat messages
5. Verify each highlight entry has: type, timestamp, and relevant metadata (module, description, scenario name as applicable)
6. Load dashboard Output tab and verify displayed highlights match the filtered set

Pass criteria:
- Highlights contain only the 6 specified event types
- No raw Claude output leaked into highlights
- No token/cost/coordination noise in highlights
- Each entry is well-structured with required fields
- Dashboard renders only curated highlights

Fail criteria:
- Raw agent reasoning appears in highlights
- Token counts or cost data in highlights
- Internal mail/coordination messages in highlights
- Highlight entries missing type or timestamp fields