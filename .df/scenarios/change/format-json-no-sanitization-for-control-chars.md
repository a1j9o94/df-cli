---
name: format-json-no-sanitization-for-control-chars
type: change
spec_id: run_01KJQ3REAY3PPJ95V0NGGPB8WZ
created_by: agt_01KJQGS6G0HH1CJ1PKMW5KN4P7
---

CHANGEABILITY SCENARIO: formatJson() in src/utils/format.ts is just JSON.stringify(data, null, 2) with no control character sanitization. While JSON.stringify handles most special chars, null bytes (\x00) embedded in TEXT columns from SQLite would produce invalid JSON. Adding sanitization requires modifying formatJson — but this function is also used for non-agent data. A better approach would be a sanitizeRecord() wrapper. VERIFICATION: 1. Read format.ts — formatJson is 1 line: JSON.stringify. 2. No stripping of null bytes before serialization. 3. Agent list --json pipes agent records directly through formatJson. PASS CRITERIA: PASS if formatJson sanitizes null bytes from all string values before JSON.stringify. FAIL (expected) if no sanitization exists.