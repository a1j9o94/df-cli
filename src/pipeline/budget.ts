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

/** Default cost per minute for time-based estimation (~$0.05/min for Sonnet). */
const DEFAULT_COST_PER_MINUTE = 0.05;

/** Default token rate estimate (~4K tokens/min). */
const DEFAULT_TOKENS_PER_MINUTE = 4000;

/**
 * Estimate and record incremental cost for an agent based on elapsed time.
 *
 * Uses time since the LATER of (last_heartbeat, last cost update via updated_at, created_at)
 * to compute an incremental cost delta, then records it via recordCost().
 *
 * This function is idempotent for rapid successive calls: each call updates
 * the agent's updated_at, so the next call measures from that point forward.
 *
 * @param db - Database connection
 * @param agentId - Agent ID to estimate cost for
 * @param costPerMinute - Cost per minute (default: $0.05)
 * @returns The new total cost for the agent
 */
export function estimateAndRecordCost(
  db: SqliteDb,
  agentId: string,
  costPerMinute: number = DEFAULT_COST_PER_MINUTE,
): number {
  const agent = getAgent(db, agentId);
  if (!agent) throw new Error(`Agent not found: ${agentId}`);

  // Determine the latest known touchpoint for this agent
  const timestamps = [agent.created_at, agent.updated_at];
  if (agent.last_heartbeat) {
    timestamps.push(agent.last_heartbeat);
  }

  const latestTouchpoint = timestamps
    .map((ts) => new Date(ts).getTime())
    .reduce((max, t) => Math.max(max, t), 0);

  const nowMs = Date.now();
  const elapsedMs = nowMs - latestTouchpoint;
  const elapsedMin = elapsedMs / 60_000;

  // Only record if meaningful elapsed time (>1 second)
  if (elapsedMin < 1 / 60) {
    // Re-read to return current total
    return getAgent(db, agentId)!.cost_usd;
  }

  const costDelta = elapsedMin * costPerMinute;
  const tokensDelta = Math.round(elapsedMin * DEFAULT_TOKENS_PER_MINUTE);

  recordCost(db, agent.run_id, agentId, costDelta, tokensDelta);

  // Update updated_at so the next call measures from now
  db.prepare("UPDATE agents SET updated_at = ? WHERE id = ?").run(
    new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    agentId,
  );

  return getAgent(db, agentId)!.cost_usd;
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

