---
name: status-shows-spec-title
type: functional
spec_id: run_01KKFJP2B248H395WES5SRNHWM
created_by: agt_01KKFJP2B477G0FJ56QPN8P0HA
---

Test that dark status shows the spec title alongside the spec ID.

SETUP:
1. Create test DB
2. Create spec in specs table: createSpec(db, 'spec_1', 'Enrich CLI output', '.df/specs/spec_1.md')
3. Create run referencing that spec: createRun(db, { spec_id: 'spec_1' })

VERIFICATION - getRunWithSpecTitle:
- Call getRunWithSpecTitle(db, runId) from src/db/queries/status-queries.ts
- result MUST NOT be null
- result.spec_title MUST equal 'Enrich CLI output'

VERIFICATION - formatStatusDetail:
- Call formatStatusDetail(db, enrichedRun) from src/utils/format-status-detail.ts
- Output MUST contain 'spec_1 (Enrich CLI output)' - spec ID followed by title in parentheses

VERIFICATION - formatStatusSummaryLine:
- Call formatStatusSummaryLine(db, enrichedRun) from src/utils/format-status-detail.ts
- Output MUST contain 'spec=spec_1 (Enrich CLI output)'

NEGATIVE TEST:
- Create run where spec is NOT in specs table
- getRunWithSpecTitle returns spec_title: null
- Output shows just the spec_id without parenthetical title

PASS CRITERIA:
- Spec title appears in parentheses after spec ID in both detail and summary views
- When spec title is unavailable (null), only spec ID is shown (no empty parens)