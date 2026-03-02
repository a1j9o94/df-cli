---
name: excludeFields-not-centralized-per-command
type: change
spec_id: run_01KJQEP7BHVFD7GS7YYJDWFWJH
created_by: agt_01KJQJ7XZCRE2KVMTVPN3DZXT6
---

CHANGEABILITY SCENARIO: The excludeFields list is duplicated in each command file (agent/list.ts defines AGENT_EXCLUDED_FIELDS, status.ts defines STATUS_EXCLUDED_FIELDS). If a new large field is added to AgentRecord, a developer must update BOTH files independently. A centralized AGENT_LARGE_FIELDS constant in a shared module would be more maintainable. VERIFICATION: 1. grep -rn 'EXCLUDED_FIELDS' src/commands/ — should find 2+ definitions. 2. Adding 'execution_log' to exclusion requires editing 2+ files. PASS: Single shared constant for fields to exclude. FAIL (expected): Exclusion lists duplicated per command.