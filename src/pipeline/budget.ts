import type { SqliteDb } from "../db/index.js";
import { getRun } from "../db/queries/runs.js";
import { getAgent, listAgents, updateAgentCost } from "../db/queries/agents.js";
import { updateRunCost } from "../db/queries/runs.js";

/** Default cost per minute for agent time estimation. */
const DEFAULT_COST_PER_MINUTE = 0.05;

export interface BudgetStatus {
  budgetUsd: number;
  spentUsd: number;
  remainingUsd: number;
  projectedUsd: number;
  overBudget: boolean;
}

export function checkBudget(db: SqliteDb, runId: string): BudgetStatus {
  const run = getRun(db, runId);
  if (!run) throw new Error(`Run not found: ${runId}`);

  const projected = projectCost(db, runId);

  return {
    budgetUsd: run.budget_usd,
    spentUsd: run.cost_usd,
    remainingUsd: Math.max(0, run.budget_usd - run.cost_usd),
    projectedUsd: projected,
    overBudget: run.cost_usd > run.budget_usd,
  };
}

export function recordCost(
  db: SqliteDb,
  runId: string,
  agentId: string,
  costUsd: number,
  tokensUsed: number,
): void {
  updateAgentCost(db, agentId, costUsd, tokensUsed);
  updateRunCost(db, runId, costUsd, tokensUsed);
}

/**
 * Estimate incremental cost for an agent based on elapsed time since last
 * cost-recording touchpoint and record it. Uses the LATER of
 * (last_heartbeat, updated_at, created_at) as the base time.
 *
 * This is the single shared helper that every agent command calls as a side
 * effect — making cost tracking automatic and unavoidable.
 *
 * Idempotent for rapid successive calls: uses time-since-last-update,
 * not time-since-creation, so calling twice in quick succession adds ~$0.
 *
 * @returns The new total cost for the agent.
 */
export function estimateAndRecordCost(
  db: SqliteDb,
  agentId: string,
  costPerMinute: number = DEFAULT_COST_PER_MINUTE,
): number {
  const agent = getAgent(db, agentId);
  if (!agent) throw new Error(`Agent not found: ${agentId}`);

  // Use the LATER of (last_heartbeat, updated_at, created_at) as the base time
  const candidates: number[] = [
    new Date(agent.created_at).getTime(),
  ];
  if (agent.updated_at) {
    candidates.push(new Date(agent.updated_at).getTime());
  }
  if (agent.last_heartbeat) {
    candidates.push(new Date(agent.last_heartbeat).getTime());
  }

  const baseTime = Math.max(...candidates);
  const nowMs = Date.now();
  const elapsedMs = nowMs - baseTime;
  const elapsedMin = elapsedMs / 60_000;

  const estimatedCost = elapsedMin * costPerMinute;
  const estimatedTokens = Math.round(elapsedMin * 4000); // ~4K tokens/min heuristic

  if (estimatedCost > 0) {
    recordCost(db, agent.run_id, agentId, estimatedCost, Math.max(0, estimatedTokens));
  }

  // Re-read the agent to get the updated total
  const updatedAgent = getAgent(db, agentId);
  return updatedAgent?.cost_usd ?? estimatedCost;
}

/**
 * Project total cost based on current spend rate and remaining work.
 * Simple heuristic: if N agents have completed costing X total,
 * and M agents remain, projected = X + (X/N * M).
 */
export function projectCost(
  db: SqliteDb,
  runId: string,
): number {
  const run = getRun(db, runId);
  if (!run) return 0;

  const agents = listAgents(db, runId);
  const completed = agents.filter((a) => a.status === "completed");
  const remaining = agents.filter((a) =>
    ["pending", "spawning", "running"].includes(a.status),
  );

  if (completed.length === 0) {
    // No data yet — return current spend
    return run.cost_usd;
  }

  const avgCostPerAgent = run.cost_usd / completed.length;
  return run.cost_usd + avgCostPerAgent * remaining.length;
}

