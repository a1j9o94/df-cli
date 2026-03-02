import type { SqliteDb } from "../db/index.js";
import type { AgentRuntime } from "../runtime/interface.js";
import { createAgent, getAgent, updateAgentPid, updateAgentStatus } from "../db/queries/agents.js";
import { createEvent } from "../db/queries/events.js";
import { recordCost } from "./budget.js";
<<<<<<< HEAD

const DEFAULT_POLL_INTERVAL_MS = 5_000;

/**
 * Configurable poll interval for testing. Use setPollInterval() to override.
 */
let pollIntervalMs = DEFAULT_POLL_INTERVAL_MS;

/**
 * Set the poll interval (primarily for testing).
 */
export function setPollInterval(ms: number): void {
  pollIntervalMs = ms;
}

/**
 * Reset the poll interval to the default.
 */
export function resetPollInterval(): void {
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS;
=======
import { sendInstructions } from "./instructions.js";

const POLL_INTERVAL_MS = 5_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
>>>>>>> df-build/run_01KJ/wire-engine-mm8rvhdu
}

/**
 * Wait for a single agent to complete (DB-based with PID fallback).
<<<<<<< HEAD
 *
 * Polls the database for agent status changes. If the agent's process exits
 * without updating its status, marks it as failed.
 *
 * @param db - Database instance
 * @param runtime - Agent runtime for checking process liveness
 * @param agentId - The agent ID to wait for
 * @param pid - Optional PID for process liveness fallback
=======
 * Polls every POLL_INTERVAL_MS. Throws on failure or unexpected exit.
 * Extracted from PipelineEngine.waitForAgent().
>>>>>>> df-build/run_01KJ/wire-engine-mm8rvhdu
 */
export async function waitForAgent(
  db: SqliteDb,
  runtime: AgentRuntime,
  agentId: string,
  pid?: number,
): Promise<void> {
  while (true) {
<<<<<<< HEAD
    await sleep(pollIntervalMs);
=======
    await sleep(POLL_INTERVAL_MS);
>>>>>>> df-build/run_01KJ/wire-engine-mm8rvhdu

    // Check DB status first
    const agentRecord = getAgent(db, agentId);
    if (agentRecord) {
      if (agentRecord.status === "completed") {
        return;
      }
      if (agentRecord.status === "failed") {
        throw new Error(`Agent failed: ${agentRecord.error ?? "unknown error"}`);
      }
    }

    // Fallback: check PID liveness
    const runtimeStatus = await runtime.status(agentId);
    if (runtimeStatus === "stopped" || runtimeStatus === "unknown") {
      // PID is dead — check DB one more time
      const finalCheck = getAgent(db, agentId);
      if (finalCheck?.status === "completed") return;
      if (finalCheck?.status === "failed") {
        throw new Error(`Agent failed: ${finalCheck.error ?? "unknown error"}`);
      }

      // Process exited without updating DB — mark as failed
      updateAgentStatus(db, agentId, "failed", "Process exited without completing");
      throw new Error("Agent process exited without completing");
    }
  }
}

/**
 * If an agent completed without self-reporting cost, estimate from elapsed time.
 * Rough heuristic: ~$0.05/min for Sonnet agents (typical tool-use sessions).
<<<<<<< HEAD
 *
 * @param db - Database instance
 * @param agent - Agent record with id, run_id, cost_usd, created_at, updated_at
=======
 * Extracted from PipelineEngine.estimateCostIfMissing().
>>>>>>> df-build/run_01KJ/wire-engine-mm8rvhdu
 */
export function estimateCostIfMissing(
  db: SqliteDb,
  agent: { id: string; run_id: string; cost_usd: number; created_at: string; updated_at: string },
): void {
  if (agent.cost_usd > 0) return; // Already reported

  const elapsedMs = new Date(agent.updated_at).getTime() - new Date(agent.created_at).getTime();
  const elapsedMin = elapsedMs / 60_000;
  const estimatedCost = Math.max(0.01, elapsedMin * 0.05); // ~$0.05/min heuristic
  const estimatedTokens = Math.round(elapsedMin * 4000); // ~4K tokens/min heuristic

  recordCost(db, agent.run_id, agent.id, estimatedCost, estimatedTokens);
}

/**
 * Spawn a single agent for a phase and wait for it to complete.
<<<<<<< HEAD
 *
 * Creates the agent record, generates the prompt, sends instructions via mail,
 * spawns the agent process, waits for completion, and estimates cost if needed.
 *
 * @param db - Database instance
 * @param runtime - Agent runtime for spawning
 * @param runId - The current run ID
 * @param role - The agent role to spawn
 * @param getPrompt - Function that generates the system prompt given an agent ID
 * @param sendInstructionsFn - Optional callback to send instructions via mail
 * @param instructionContext - Optional context to pass to sendInstructionsFn
=======
 * Creates agent record, generates prompt, sends instructions, spawns via runtime, polls until done.
 * Extracted from PipelineEngine.executeAgentPhase().
>>>>>>> df-build/run_01KJ/wire-engine-mm8rvhdu
 */
export async function executeAgentPhase(
  db: SqliteDb,
  runtime: AgentRuntime,
  runId: string,
  role: "architect" | "evaluator" | "merger" | "integration-tester",
  getPrompt: (agentId: string) => string,
<<<<<<< HEAD
  sendInstructionsFn?: (runId: string, agentId: string, role: string, context: Record<string, unknown>) => void,
=======
>>>>>>> df-build/run_01KJ/wire-engine-mm8rvhdu
  instructionContext?: Record<string, unknown>,
): Promise<void> {
  const agent = createAgent(db, {
    agent_id: "", // Will be overwritten — createAgent generates its own ID
    run_id: runId,
    role,
    name: `${role}-${Date.now()}`,
    system_prompt: "pending",
  });

  const prompt = getPrompt(agent.id);
  // Update system prompt after we have the agent ID
  db.prepare("UPDATE agents SET system_prompt = ? WHERE id = ?").run(prompt, agent.id);

  // Send actionable instructions via mail before spawning
<<<<<<< HEAD
  if (sendInstructionsFn) {
    sendInstructionsFn(runId, agent.id, role, instructionContext ?? {});
  }
=======
  sendInstructions(db, runId, agent.id, role, instructionContext ?? {});
>>>>>>> df-build/run_01KJ/wire-engine-mm8rvhdu

  createEvent(db, runId, "agent-spawned", { role }, agent.id);
  console.log(`[dark] Phase ${role}: spawning agent...`);

  const handle = await runtime.spawn({
    agent_id: agent.id,
    run_id: runId,
    role,
    name: agent.name,
    system_prompt: prompt,
  });

  updateAgentPid(db, agent.id, handle.pid);
  console.log(`[dark] Phase ${role}: agent spawned (PID ${handle.pid})... waiting for completion`);

  // Poll until agent completes (DB-based)
  await waitForAgent(db, runtime, agent.id, handle.pid);

  const finalAgent = getAgent(db, agent.id);
  if (finalAgent) {
    estimateCostIfMissing(db, finalAgent);
    console.log(`[dark] Agent ${finalAgent.name} completed. Cost: $${finalAgent.cost_usd.toFixed(2)}`);
  }
}
<<<<<<< HEAD

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
=======
>>>>>>> df-build/run_01KJ/wire-engine-mm8rvhdu
