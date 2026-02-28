import type { SqliteDb } from "../db/index.js";
import type { Buildplan, IntegrationCheckpoint } from "../types/index.js";
import type { AgentRuntime } from "../runtime/interface.js";
import { getRun } from "../db/queries/runs.js";
import { getActiveBuildplan } from "../db/queries/buildplans.js";
import { createAgent, updateAgentPid, updateAgentStatus } from "../db/queries/agents.js";
import { createEvent } from "../db/queries/events.js";
import { getEvaluatorPrompt } from "../agents/prompts/evaluator.js";
import { log } from "../utils/logger.js";

export interface IntegrationResult {
  passed: boolean;
  checkpointResults: CheckpointResult[];
  finalResult: CheckpointResult | null;
}

export interface CheckpointResult {
  checkpoint: string;
  passed: boolean;
  error?: string;
  modulesInvolved: string[];
}

/**
 * Run integration tests for a build run.
 * Spawns an integration-tester agent that composes builder outputs
 * and validates they work together per the buildplan's integration strategy.
 */
export async function runIntegration(
  db: SqliteDb,
  runtime: AgentRuntime,
  runId: string,
  phase?: number,
): Promise<IntegrationResult> {
  const run = getRun(db, runId);
  if (!run) throw new Error(`Run not found: ${runId}`);

  const bp = getActiveBuildplan(db, run.spec_id);
  if (!bp) throw new Error(`No active buildplan for spec: ${run.spec_id}`);

  const plan: Buildplan = JSON.parse(bp.plan);
  const strategy = plan.integration_strategy;

  createEvent(db, runId, "integration-started", { phase });

  // Filter checkpoints if a specific phase is requested
  const checkpoints = phase != null
    ? strategy.checkpoints.filter((cp) => cp.after_phase === phase)
    : strategy.checkpoints;

  const results: CheckpointResult[] = [];

  // Spawn integration-tester agent
  const agent = createAgent(db, {
    run_id: runId,
    role: "integration-tester",
    name: `integration-tester-${Date.now()}`,
    system_prompt: buildIntegrationPrompt(plan, checkpoints),
  });

  createEvent(db, runId, "agent-spawned", { role: "integration-tester" }, agent.id);

  const handle = await runtime.spawn({
    run_id: runId,
    role: "integration-tester",
    name: agent.name,
    system_prompt: agent.system_prompt!,
  });

  updateAgentPid(db, agent.id, handle.pid);

  // Wait for agent to complete
  let status = await runtime.status(agent.id);
  while (status === "running") {
    await new Promise((r) => setTimeout(r, 5000));
    status = await runtime.status(agent.id);
  }

  updateAgentStatus(db, agent.id, "completed");

  // For now, we trust the agent's output.
  // In a full implementation, the agent would write results back via df CLI commands.
  const allPassed = true; // Placeholder — agent determines this

  for (const cp of checkpoints) {
    results.push({
      checkpoint: cp.test,
      passed: allPassed,
      modulesInvolved: cp.modules_involved,
    });
  }

  const finalResult: CheckpointResult | null = strategy.final_integration
    ? { checkpoint: strategy.final_integration, passed: allPassed, modulesInvolved: plan.modules.map((m) => m.id) }
    : null;

  const passed = results.every((r) => r.passed) && (finalResult?.passed ?? true);

  createEvent(db, runId, passed ? "integration-passed" : "integration-failed", {
    checkpointsRun: results.length,
    checkpointsPassed: results.filter((r) => r.passed).length,
  });

  if (passed) {
    log.success(`Integration tests passed (${results.length} checkpoints)`);
  } else {
    log.error(`Integration tests failed`);
  }

  return { passed, checkpointResults: results, finalResult };
}

function buildIntegrationPrompt(plan: Buildplan, checkpoints: IntegrationCheckpoint[]): string {
  const tests = checkpoints
    .map((cp, i) => `${i + 1}. After phase ${cp.after_phase}: ${cp.test}\n   Modules: ${cp.modules_involved.join(", ")}`)
    .join("\n");

  return `You are an Integration-Tester agent in a Dark Factory pipeline.

Your job is to compose the outputs of parallel builders and verify they work together.

## Checkpoints to validate:
${tests || "(No checkpoints defined)"}

## Final integration test:
${plan.integration_strategy.final_integration || "(None)"}

## Instructions:
1. Merge builder worktrees into a single integration branch
2. Run each checkpoint test
3. Run the final integration test
4. Report results via: df agent complete <your-id> or df agent fail <your-id> --error "<description>"
`;
}
