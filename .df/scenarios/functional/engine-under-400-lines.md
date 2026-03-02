---
name: engine-under-400-lines
type: functional
spec_id: run_01KJPFGY2T1DE169DE6RN9JA73
created_by: agt_01KJPFGY2WBZ0213X7W4G0YTRZ
---

Precondition: Module 5 (wire-engine) has been applied to engine.ts.

Steps:
1. Run: wc -l src/pipeline/engine.ts
2. Parse the line count from the output

Expected:
- src/pipeline/engine.ts has fewer than 400 lines total
- The file went from 1136 lines to under 400 lines

Pass criteria: The output of wc -l src/pipeline/engine.ts shows a number strictly less than 400.