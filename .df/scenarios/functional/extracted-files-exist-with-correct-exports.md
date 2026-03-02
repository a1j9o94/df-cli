---
name: extracted-files-exist-with-correct-exports
type: functional
spec_id: run_01KJPFGY2T1DE169DE6RN9JA73
created_by: agt_01KJPFGY2WBZ0213X7W4G0YTRZ
---

Precondition: All 4 extraction modules have been built and merged.

Steps:
1. Verify file exists: src/pipeline/instructions.ts
   - grep for 'export function sendInstructions' or 'export async function sendInstructions'
   - Signature must accept (db: SqliteDb, runId: string, agentId: string, role: string, context: Record<string, unknown>)

2. Verify file exists: src/pipeline/agent-lifecycle.ts
   - grep for 'export function waitForAgent' or 'export async function waitForAgent'
   - grep for 'export function estimateCostIfMissing'
   - grep for 'export function executeAgentPhase' or 'export async function executeAgentPhase'
   - waitForAgent signature: (db: SqliteDb, runtime: AgentRuntime, agentId: string, pid?: number)
   - estimateCostIfMissing signature: (db: SqliteDb, agent: {...})
   - executeAgentPhase signature: (db: SqliteDb, runtime: AgentRuntime, runId: string, role: ..., getPrompt: ..., instructionContext?: ...)

3. Verify file exists: src/pipeline/build-phase.ts
   - grep for 'export function executeBuildPhase' or 'export async function executeBuildPhase'
   - grep for 'export function executeResumeBuildPhase' or 'export async function executeResumeBuildPhase'
   - executeBuildPhase signature: (db: SqliteDb, runtime: AgentRuntime, config: DfConfig, runId: string)
   - executeResumeBuildPhase signature: (db: SqliteDb, runtime: AgentRuntime, config: DfConfig, runId: string, previouslyCompletedModules: Set<string>)

4. Verify file exists: src/pipeline/merge-phase.ts
   - grep for 'export function executeMergePhase' or 'export async function executeMergePhase'
   - executeMergePhase signature: (db: SqliteDb, runtime: AgentRuntime, config: DfConfig, runId: string)

Expected: All 4 files exist and export the specified functions with correct signatures.
Pass criteria: All grep checks find the expected exports in the expected files.