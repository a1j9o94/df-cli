---
name: module-agent-lookup-no-order-by-before-limit
type: change
spec_id: run_01KJP8WZ5DKH52F4S0SWCGKJWW
created_by: agt_01KJPDQXHX26V9H6V6QDAV30GC
---

CHANGEABILITY SCENARIO: handleGetModules in server.ts line 367 queries SELECT * FROM agents WHERE run_id = ? AND module_id = ? LIMIT 1 without ORDER BY. If a module has been retried (multiple agents assigned), the query returns a nondeterministic agent row — it may show a failed attempt instead of the latest. VERIFICATION: 1. Read server.ts line 367: SELECT without ORDER BY before LIMIT 1. 2. If multiple agents exist for same module (retry scenario), results are undefined. PASS CRITERIA: PASS if the agent lookup includes ORDER BY created_at DESC LIMIT 1 to always return the LATEST agent for a module. FAIL (expected) if LIMIT 1 is used without ORDER BY.