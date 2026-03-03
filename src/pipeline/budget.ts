import type { SqliteDb } from "../db/index.js";
import { getRun } from "../db/queries/runs.js";
import { getAgent, listAgents, updateAgentCost } from "../db/queries/agents.js";
import { updateRunCost } from "../db/queries/runs.js";

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

/**
 * Estimate cost for an agent based on elapsed time since last update and record it.
 *
 * Uses the LATER of (last_heartbeat, updated_at, created_at) as the baseline,
 * so rapid successive calls are idempotent (delta is near-zero).
 *
 * @param db - Database instance
 * @param agentId - Agent ID to estimate cost for
 * @param costPerMinute - Cost per minute (defaults to 0.05)
 * @returns The new total cost for the agent
 */
export function estimateAndRecordCost(
  db: SqliteDb,
  agentId: string,
  costPerMinute: number = 0.05,
): number {
  const agent = getAgent(db, agentId);
  if (!agent) throw new Error(`Agent not found: ${agentId}`);

  // Use the LATER of last_heartbeat, updated_at, created_at as the baseline
  const candidates = [agent.created_at, agent.updated_at];
  if (agent.last_heartbeat) {
    candidates.push(agent.last_heartbeat);
  }
  const latestTimestamp = candidates.reduce((latest, ts) => {
    return new Date(ts).getTime() > new Date(latest).getTime() ? ts : latest;
  });

  const elapsedMs = Date.now() - new Date(latestTimestamp).getTime();
  const elapsedMin = Math.max(0, elapsedMs / 60_000);
  const estimatedCost = elapsedMin * costPerMinute;
  const estimatedTokens = Math.round(elapsedMin * 4000); // ~4K tokens/min heuristic

  if (estimatedCost > 0) {
    recordCost(db, agent.run_id, agentId, estimatedCost, estimatedTokens);
  }

  // Return the new total cost
  const updatedAgent = getAgent(db, agentId);
  return updatedAgent!.cost_usd;
}
