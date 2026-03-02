---
name: evaluator-mode-always-functional-in-engine
type: change
spec_id: run_01KJQERB5P8DCWZJXCZR5Z64BW
created_by: agt_01KJQPSYMK3FZ6E1ZPBBKYXYG0
---

CHANGEABILITY SCENARIO: engine.ts lines 290 and 298 both hardcode mode: 'functional' when calling getEvaluatorPrompt, even for evaluate-change phase. The evaluator spawned for change evaluation receives functional mode, which means it may not properly evaluate change scenarios. VERIFICATION: Read engine.ts lines 288-300 — both evaluator spawn calls use mode: 'functional'. PASS CRITERIA: PASS if evaluate-functional phase uses mode 'functional' and evaluate-change phase uses mode 'change'. FAIL (expected) if both phases hardcode mode 'functional'.