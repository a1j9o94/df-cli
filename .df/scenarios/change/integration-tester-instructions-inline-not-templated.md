---
name: integration-tester-instructions-inline-not-templated
type: change
spec_id: run_01KJP6GK3B3RYANRP51CFYXDF7
created_by: agt_01KJPAH46Y8AXDSK1QTJXMT0CF
---

CHANGEABILITY SCENARIO: Integration tester instructions are hardcoded inline strings in engine.ts:749-764, not composed from a template or context module. There is no IntegrationTesterContext interface and no instruction-context.ts module. VERIFICATION: 1. Grep for IntegrationTesterContext — not found. 2. Grep for instruction-context — not found. 3. Read engine.ts lines 749-764 — instructions are a string array joined by newline. 4. No modules/files/contracts are referenced in integration tester mail — it has no awareness of what was built. PASS CRITERIA: PASS if integration tester instructions are composed from a structured context object with fields for modules, contracts, and file lists. FAIL (expected) if instructions are plain inline strings with no structured context.