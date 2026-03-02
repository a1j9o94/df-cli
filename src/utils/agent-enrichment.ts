import type { AgentRecord } from "../types/agent.js";

/** Default cost rate: $0.05 per minute of agent runtime */
const DEFAULT_COST_RATE_PER_MIN = 0.05;

/** Active statuses that mean the agent is still running/alive */
const ACTIVE_STATUSES = new Set(["pending", "spawning", "running"]);

/** Dead statuses that mean the agent terminated unsuccessfully */
const DEAD_STATUSES = new Set(["failed", "killed"]);

/**
 * Compute elapsed time in milliseconds for an agent based on its created_at timestamp.
 * Only returns a non-zero value for active agents (pending, spawning, running).
 * For completed/failed/killed agents, return 0 (use total_active_ms from the DB instead).
 */
export function computeElapsedMs(createdAt: string, status: string): number {
  if (!ACTIVE_STATUSES.has(status)) return 0;
  return Math.max(0, Date.now() - new Date(createdAt).getTime());
}

/**
 * Estimate the cost of an agent based on elapsed time.
 * Uses a flat rate per minute of runtime.
 */
export function estimateCost(elapsedMs: number, ratePerMin: number = DEFAULT_COST_RATE_PER_MIN): number {
  if (elapsedMs <= 0) return 0;
  const minutes = elapsedMs / 60000;
  return minutes * ratePerMin;
}

/**
 * Categorized agent counts for status display.
 */
export interface AgentCounts {
  active: number;
  completed: number;
  dead: number;
  summary: string;
}

/**
 * Summarize agents into status categories: active, completed, dead.
 * Active = pending + spawning + running
 * Completed = completed
 * Dead = failed + killed
 */
export function summarizeAgentCounts(agents: AgentRecord[]): AgentCounts {
  let active = 0;
  let completed = 0;
  let dead = 0;

  for (const agent of agents) {
    if (ACTIVE_STATUSES.has(agent.status)) {
      active++;
    } else if (agent.status === "completed") {
      completed++;
    } else if (DEAD_STATUSES.has(agent.status)) {
      dead++;
    }
  }

  const summary = `${active} active, ${completed} completed, ${dead} dead`;

  return { active, completed, dead, summary };
}
