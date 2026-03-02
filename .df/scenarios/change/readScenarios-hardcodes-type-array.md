---
name: readScenarios-hardcodes-type-array
type: change
spec_id: run_01KJP8WZ5DKH52F4S0SWCGKJWW
created_by: agt_01KJPDQXHX26V9H6V6QDAV30GC
---

CHANGEABILITY SCENARIO: readScenarios() in src/pipeline/instruction-context.ts line 197 hardcodes scenario types as ['functional', 'change']. This is a fourth location (alongside create.ts, engine.ts evaluator instructions, and evaluator.ts prompt) where scenario types are embedded. Adding a new type requires updating this array as well. VERIFICATION: 1. Read instruction-context.ts line 197: for (const type of ['functional', 'change'] as const). 2. This array is not derived from a shared constant or config. 3. Adding 'performance' type requires updating this loop. PASS CRITERIA: PASS if readScenarios reads type directories dynamically (e.g., readdirSync on scenarios/ to discover all type subdirectories). FAIL (expected) if the type list is hardcoded.