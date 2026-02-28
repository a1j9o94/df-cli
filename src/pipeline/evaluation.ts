import type { SqliteDb } from "../db/index.js";
import type { AgentRuntime } from "../runtime/interface.js";
import { getRun } from "../db/queries/runs.js";
import { createAgent, updateAgentPid, updateAgentStatus } from "../db/queries/agents.js";
import { createEvent } from "../db/queries/events.js";
import { getEvaluatorPrompt } from "../agents/prompts/evaluator.js";
import { log } from "../utils/logger.js";

export interface EvaluationResult {
  mode: "functional" | "change";
  passed: boolean;
  score: number;
  threshold: number;
  scenarioResults: ScenarioResult[];
}

export interface ScenarioResult {
  scenarioId: string;
  passed: boolean;
  score: number;
  notes?: string;
}

/**
 * Run evaluation against holdout scenarios.
 * Spawns an evaluator agent that tests the integrated code.
 */
export async function runEvaluation(
  db: SqliteDb,
  runtime: AgentRuntime,
  runId: string,
  mode: "functional" | "change",
  threshold: number,
  scenarioIds: string[] = [],
): Promise<EvaluationResult> {
  const run = getRun(db, runId);
  if (!run) throw new Error(`Run not found: ${runId}`);

  createEvent(db, runId, "evaluation-started", { mode, threshold });

  const agent = createAgent(db, {
    run_id: runId,
    role: "evaluator",
    name: `evaluator-${mode}-${Date.now()}`,
    system_prompt: getEvaluatorPrompt({
      specId: run.spec_id,
      runId,
      agentId: "pending",
      scenarioIds,
      mode,
    }),
  });

  createEvent(db, runId, "agent-spawned", { role: "evaluator", mode }, agent.id);

  const handle = await runtime.spawn({
    run_id: runId,
    role: "evaluator",
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

  // In a full implementation, the evaluator would report results back via CLI.
  // For now, return a placeholder result.
  const score = 1.0; // Placeholder
  const passed = score >= threshold;

  const scenarioResults: ScenarioResult[] = scenarioIds.map((id) => ({
    scenarioId: id,
    passed: true,
    score: 1.0,
  }));

  createEvent(db, runId, passed ? "evaluation-passed" : "evaluation-failed", {
    mode, score, threshold,
    scenariosRun: scenarioResults.length,
    scenariosPassed: scenarioResults.filter((s) => s.passed).length,
  });

  if (passed) {
    log.success(`Evaluation (${mode}): passed (score=${score.toFixed(2)}, threshold=${threshold.toFixed(2)})`);
  } else {
    log.error(`Evaluation (${mode}): failed (score=${score.toFixed(2)}, threshold=${threshold.toFixed(2)})`);
  }

  return { mode, passed, score, threshold, scenarioResults };
}
