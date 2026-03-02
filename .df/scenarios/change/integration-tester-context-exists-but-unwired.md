---
name: integration-tester-context-exists-but-unwired
type: change
spec_id: run_01KJP8WZ5DKH52F4S0SWCGKJWW
created_by: agt_01KJPDQXHX26V9H6V6QDAV30GC
---

CHANGEABILITY SCENARIO: IntegrationTesterContext interface and gatherIntegrationTesterContext() exist in src/pipeline/instruction-context.ts, but engine.ts sendInstructions (lines 749-764) does NOT use them — it sends plain inline strings. The structured context module was built but never connected. VERIFICATION: 1. Read instruction-context.ts — IntegrationTesterContext interface exists (line 55). 2. gatherIntegrationTesterContext() function exists (line 332). 3. Read engine.ts sendInstructions case 'integration-tester' (lines 749-764) — plain string array. 4. No reference to IntegrationTesterContext or gatherIntegrationTesterContext anywhere in engine.ts. PASS CRITERIA: PASS if engine.ts sendInstructions for integration-tester uses gatherIntegrationTesterContext to compose structured instructions including modules, contracts, and file lists. FAIL (expected) if sendInstructions uses plain inline strings despite the structured context module existing.