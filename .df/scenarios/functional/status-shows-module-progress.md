---
name: status-shows-module-progress
type: functional
spec_id: run_01KKFJP2B248H395WES5SRNHWM
created_by: agt_01KKFJP2B477G0FJ56QPN8P0HA
---

Test that dark status shows per-module build status inline (done/building/pending).

SETUP:
1. Create test DB
2. Create run and architect agent
3. Create buildplan with 3 modules: parser, lexer, codegen
   - Use makeBuildplanJson with modules array
   - Set buildplan status to 'active' via updateBuildplanStatus
4. Create builder agents:
   - parser: status=completed (via updateAgentStatus)
   - lexer: status=running (via updateAgentPid), created_at ~12m ago
   - codegen: no agent assigned (pending)

VERIFICATION - getModuleProgress:
- Call getModuleProgress(db, runId) from src/db/queries/status-queries.ts
- Result MUST have length 3
- parser entry: status='completed', agentName='b-parser'
- lexer entry: status='running', agentName='b-lexer', elapsedMs > 0
- codegen entry: status='pending', agentName=null

VERIFICATION - formatModuleProgressInline:
- Call formatModuleProgressInline(progress) from src/utils/format-module-progress.ts
- Output MUST contain 'parser(done)'
- Output MUST contain 'lexer(building' followed by elapsed time
- Output MUST contain 'codegen(pending)'
- All three module statuses on one line separated by spaces

VERIFICATION - in formatStatusDetail:
- Call formatStatusDetail(db, run) from src/utils/format-status-detail.ts
- Output MUST contain a line starting with '  Modules:' followed by the inline module progress

PASS CRITERIA:
- Completed modules show as 'done'
- Running/spawning modules show as 'building' with elapsed time
- Unassigned modules show as 'pending'
- Failed modules show as 'failed'
- All modules displayed inline on the Modules: line