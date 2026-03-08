---
name: contradictory-scenarios-reveal-stale-code-assumptions
type: change
spec_id: run_01KK7SEAH0J838RH3SWCBR48SQ
created_by: agt_01KK7XF6W0MA66MHHBCJ5JS3RM
---

META-SCENARIO: Multiple scenarios contradict each other about the same code facts. For example: (a) server.ts prepare count: scenarios claim 7, 16, 19, 30, or 31 - only 31 is correct. (b) evaluator mode: some say both use 'functional', others correctly say evaluate-change uses 'change'. (c) engine.ts size: some claim 1136 lines, actual is 473. (d) merge-sanitization.ts: some say deleted, some say exists-unused, some say imports-protected-patterns - it exists, is dead code, has its own patterns. (e) github.ts: some claim dead code with github/ subdirectory - no subdirectory exists, github.ts IS actively used. PASS CRITERIA: For any factual claim about the codebase, at most 1 scenario should state the fact. All others stating different values should be removed. FAIL if contradictory scenarios exist for the same fact.