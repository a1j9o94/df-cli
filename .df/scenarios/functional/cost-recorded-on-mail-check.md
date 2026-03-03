---
name: cost-recorded-on-mail-check
type: functional
spec_id: run_01KJSRR001N48MFYRE9XHH1TA0
created_by: agt_01KJSRR002NH10ZW5RZY4QVC13
---

SCENARIO: Calling `dark mail check` increases agent cost even though mail check has no --cost option.

PRECONDITIONS:
- A Dark Factory project is initialized
- An agent exists in 'running' status
- agent.cost_usd == 0 initially

STEPS:
1. Create an agent record. Note agent.cost_usd == 0.
2. Wait a few seconds (enough for measurable elapsed time).
3. Agent calls `dark mail check --agent <id>`.
4. Query agent.cost_usd.

EXPECTED:
- agent.cost_usd > 0 after mail check
- The cost increment is based on elapsed time since agent creation (or last command)

VERIFICATION (code-level):
- src/commands/mail/check.ts imports estimateAndRecordCost from pipeline/budget
- The function is called during the mail check command handler
- No --cost flag needed — estimation is automatic

PASS CRITERIA:
- agent.cost_usd > 0 after a single mail check call
- The cost is proportional to elapsed time

FAIL CRITERIA:
- agent.cost_usd == 0 after mail check (estimation not wired up)
- mail/check.ts does not import or call estimateAndRecordCost