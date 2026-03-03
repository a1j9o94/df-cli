---
name: weekly-digest-cli
type: functional
spec_id: run_01KJSYMVS0W36Y61PR2WNYBM7W
created_by: agt_01KJSYMVS1M06HAVTY6C5FAXR2
---

## Weekly digest CLI command

### Preconditions
- 2 specs completed with known costs and pass rates
- 1 spec currently in progress (building)
- 2 draft specs in the backlog

### Setup Steps
1. Complete spec A: cost=4.23, 8/8 scenarios passed, completed Monday of current week
2. Complete spec B: cost=1.10, 5/5 scenarios passed, completed Tuesday of current week
3. Start building spec C: currently in build phase, module 2/4, cost so far=3.50
4. Draft specs D (layer 0) and E (layer 1, depends on D)

### Test Steps
1. Run: dark timeline digest --week
2. Capture stdout output
3. Verify markdown format

### Expected Results
- Output starts with '# Weekly Digest — <date>' where date is current week's Monday
- Contains '## Completed (2)' section listing spec A and B with title, completion day, cost, scenario counts
- Contains '## In Progress (1)' section listing spec C with module progress and cost
- Contains '## Planned (2)' section with layer groupings
- Ends with '**Total cost this week: $X.XX**' summing completed costs
- Output is valid, clean markdown with no HTML tags or broken formatting
- Each completed entry formatted like: '- **Spec Title** — completed Mon, $4.23, 8/8 scenarios'

### Pass/Fail Criteria
- PASS: Output matches expected markdown structure, all sections present, costs correct
- FAIL: Missing sections, wrong counts, malformed markdown, or incorrect cost totals