---
name: add-new-large-field-to-agent
type: change
spec_id: run_01KJQEP7BHVFD7GS7YYJDWFWJH
created_by: agt_01KJQEP7BJ05Z2KCGS05N3R3ZW
---

## Change Scenario: Adding a new large text field to AgentRecord

### Modification Description
A developer wants to add a new 'execution_log' field (large text, potentially multiline) to AgentRecord. This field should also be excluded from --json output by default and only shown with --verbose.

### Expected Effort
- Add field to AgentRecord type in src/types/agent.ts (1 line)
- Add field to excludeFields list in format utility (add to existing array) OR add to the exclusion logic in the commands that output agents
- No changes needed to individual command files if the exclusion is centralized in formatJson

### Affected Areas
- src/types/agent.ts — new field definition
- src/utils/format.ts OR src/commands/agent/list.ts — exclusion config
- Database schema migration (separate concern)

### Pass/Fail Criteria
- PASS if: Adding a new large field to the exclusion list requires changing <=2 files and <=5 lines of code
- FAIL if: Every command file that outputs agents needs to be individually updated to exclude the new field (indicates exclusion logic is scattered, not centralized)