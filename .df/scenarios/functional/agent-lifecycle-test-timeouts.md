---
name: agent-lifecycle-test-timeouts
type: functional
spec_id: run_01KJQ3RPWCVM02YZ86GB23AHTX
created_by: agt_01KJQ61PK9FQEVPTC780QYZBRS
---

SCENARIO: 4 tests in tests/unit/pipeline/agent-lifecycle.test.ts consistently timeout at 5000ms. STEPS: 1. Run bun test tests/unit/pipeline/agent-lifecycle.test.ts. 2. Observe 4 timeout failures: waitForAgent resolves when completed, waitForAgent throws on fail, waitForAgent throws on process exit, executeAgentPhase spawns and waits. EXPECTED: All tests pass within 5s timeout. ACTUAL: All 4 timeout. CAUSE: waitForAgent polls with DEFAULT_POLL_INTERVAL_MS=5000ms, but the test mock resolves the agent status change synchronously. The first poll at 5000ms coincides with the test timeout. Tests need either a shorter poll interval injected or the mock needs to trigger before the first sleep. FIX: Pass pollIntervalMs=50 to waitForAgent in tests, or mock sleep to resolve immediately.