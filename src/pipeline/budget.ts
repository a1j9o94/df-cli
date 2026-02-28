import type { SqliteDb } from "../db/index.js";
import { getRun } from "../db/queries/runs.js";
import { listAgents, updateAgentCost } from "../db/queries/agents.js";
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
