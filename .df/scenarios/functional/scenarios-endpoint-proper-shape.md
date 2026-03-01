---
name: scenarios-endpoint-proper-shape
type: functional
created_by: agt_01KJNAX32F7M374MK7X7ZWGV1M
---

SCENARIO: Scenarios API returns proper scenario results with name, type, and pass/fail status

PRECONDITIONS:
- A run exists with completed evaluation
- Holdout scenarios exist in .df/scenarios/functional/ and .df/scenarios/change/

STEPS:
1. Start dashboard server
2. GET /api/runs/:id/scenarios
3. Parse the returned JSON array
4. Verify each element has: name (string), type ('functional' or 'change'), result or status ('pass', 'fail', or 'pending')
5. Verify scenario names match the files in .df/scenarios/

EXPECTED OUTPUTS:
- Array of objects each with: name, type, result/status
- type is one of: 'functional', 'change'
- result/status is one of: 'pass', 'fail', 'pending'

PASS CRITERIA:
- Each scenario result has a proper name, type, and result field
- FAIL if the endpoint returns raw events instead of proper scenario results
- FAIL if scenario names don't correspond to actual holdout scenario files
