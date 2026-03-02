---
name: agent-list-json-no-field-exclusion-mechanism
type: change
spec_id: run_01KJQ3REAY3PPJ95V0NGGPB8WZ
created_by: agt_01KJQGS6G0HH1CJ1PKMW5KN4P7
---

CHANGEABILITY SCENARIO: agent list --json outputs ALL fields including system_prompt (potentially large). There is no centralized field exclusion mechanism. formatJson in format.ts is just JSON.stringify with no filtering. Adding a new large field (e.g. execution_log) to AgentRecord means it automatically appears in all JSON output. Each command file would need individual changes to exclude it. VERIFICATION: 1. Read format.ts — formatJson has no exclude/omit parameter. 2. Read commands/agent/list.ts — passes agents directly to formatJson with no filtering. 3. No verbose/default field set concept exists. PASS CRITERIA: PASS if formatJson or agent list has a centralized field exclusion list that automatically applies to new fields matching a pattern (e.g. large text fields). FAIL (expected) if no exclusion mechanism exists.