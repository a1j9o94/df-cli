import type { SqliteDb } from "../db/index.js";
import type { AgentRuntime } from "../runtime/interface.js";
import { getRun, updateRunStatus } from "../db/queries/runs.js";
import { getActiveAgents } from "../db/queries/agents.js";
import { createEvent, listEvents } from "../db/queries/events.js";
import { log } from "../utils/logger.js";

/** Budget warning threshold: 80% of budget */
export const BUDGET_WARNING_THRESHOLD = 0.8;

/** Budget pause threshold: 100% of budget */
export const BUDGET_PAUSE_THRESHOLD = 1.0;

export type PauseReason = "budget_exceeded" | "manual";

export interface AgentPauseState {
  agent_id: string;
  role: string;
  module_id: string | null;
  status: string;
  worktree_path: string | null;
  pid: number | null;
}

export interface PauseResult {
  success: boolean;
  error?: string;
  agentStates?: AgentPauseState[];
}

export interface BudgetThresholdResult {
  action: "none" | "warning" | "pause";
  warningEmitted: boolean;
  shouldPause: boolean;
  percentUsed: number;
  spentUsd: number;
  budgetUsd: number;
}

export interface ResumeResult {
  success: boolean;
  error?: string;
}

/**
 * Pause a running pipeline run.
 *
 * 1. Marks run as 'paused' in the database
 * 2. Records agent positions (phase, module, status) for later resume
 * 3. Preserves all worktrees — does NOT clean up
 * 4. Emits 'run-paused' event with reason and timestamp
 *
 * Contract: PauseSequenceContract
 */
export async function pauseRun(
  db: SqliteDb,
  runtime: AgentRuntime,
  runId: string,
  reason: PauseReason,
): Promise<PauseResult> {
  const run = getRun(db, runId);
  if (!run) {
    return { success: false, error: `Run not found: ${runId}` };
  }

  if (run.status === "paused") {
    return { success: false, error: `Run ${runId} is already paused` };
  }

  if (run.status === "completed" || run.status === "cancelled" || run.status === "failed") {
    return { success: false, error: `Run ${runId} cannot be paused (status: ${run.status})` };
  }

  // Record agent positions before pausing
  const activeAgents = getActiveAgents(db, runId);
  const agentStates: AgentPauseState[] = activeAgents.map((a) => ({
    agent_id: a.id,
    role: a.role,
    module_id: a.module_id ?? null,
    status: a.status,
    worktree_path: a.worktree_path ?? null,
    pid: a.pid ?? null,
  }));

  // Mark run as paused
  updateRunStatus(db, runId, "paused");

  // Emit run-paused event with agent states and reason
  const pausedAt = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  createEvent(db, runId, "run-paused" as any, {
    reason,
    paused_at: pausedAt,
    cost_usd: run.cost_usd,
    budget_usd: run.budget_usd,
    agent_states: agentStates,
    current_phase: run.current_phase,
  });

  // Log pause message
  if (reason === "budget_exceeded") {
    console.log(
      `[dark] Run paused: budget $${run.budget_usd.toFixed(2)} reached ($${run.cost_usd.toFixed(2)} spent).`
    );
    console.log(`Resume with: dark continue ${runId} --budget-usd <new-total>`);
  } else {
    console.log(`[dark] Run ${runId} paused manually. Resume with: dark continue ${runId}`);
  }

  return { success: true, agentStates };
}

/**
 * Check budget thresholds for a run.
 *
 * Returns the appropriate action:
 * - "none": under 80%, or no budget set, or warning already emitted
 * - "warning": at/over 80% but under 100%, and warning not yet emitted
 * - "pause": at/over 100%
 *
 * Contract: BudgetThresholdContract
 */
export function checkBudgetThresholds(
  db: SqliteDb,
  runId: string,
): BudgetThresholdResult {
  const run = getRun(db, runId);
  if (!run) throw new Error(`Run not found: ${runId}`);

  const { budget_usd: budgetUsd, cost_usd: spentUsd } = run;

  // No budget set — skip all checks
  if (budgetUsd <= 0) {
    return {
      action: "none",
      warningEmitted: false,
      shouldPause: false,
      percentUsed: 0,
      spentUsd,
      budgetUsd,
    };
  }

  const percentUsed = (spentUsd / budgetUsd) * 100;

  // At or over 100% — pause
  if (spentUsd >= budgetUsd * BUDGET_PAUSE_THRESHOLD) {
    return {
      action: "pause",
      warningEmitted: false,
      shouldPause: true,
      percentUsed,
      spentUsd,
      budgetUsd,
    };
  }

  // At or over 80% — check if warning already emitted
  if (spentUsd >= budgetUsd * BUDGET_WARNING_THRESHOLD) {
    // Check if we already emitted a warning for this run
    const existingWarnings = listEvents(db, runId, { type: "budget-warning" as any });
    if (existingWarnings.length > 0) {
      return {
        action: "none",
        warningEmitted: false,
        shouldPause: false,
        percentUsed,
        spentUsd,
        budgetUsd,
      };
    }

    return {
      action: "warning",
      warningEmitted: true,
      shouldPause: false,
      percentUsed,
      spentUsd,
      budgetUsd,
    };
  }

  // Under 80%
  return {
    action: "none",
    warningEmitted: false,
    shouldPause: false,
    percentUsed,
    spentUsd,
    budgetUsd,
  };
}

/**
 * Validate and prepare a paused run for resumption.
 *
 * - Validates run is in 'paused' state
 * - Validates new budget > current spend
 * - Sets status to 'running' with new budget
 * - Emits 'run-resumed' event
 *
 * Contract: PauseStateContract
 */
export function resumePausedRun(
  db: SqliteDb,
  runId: string,
  newBudgetUsd: number,
): ResumeResult {
  const run = getRun(db, runId);
  if (!run) {
    return { success: false, error: `Run not found: ${runId}` };
  }

  if (run.status !== "paused") {
    return { success: false, error: `Run ${runId} is not paused (status: ${run.status})` };
  }

  if (newBudgetUsd <= run.cost_usd) {
    return {
      success: false,
      error: `New budget ($${newBudgetUsd}) must exceed current spend ($${run.cost_usd.toFixed(2)}).`,
    };
  }

  // Update budget
  const ts = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  db.prepare("UPDATE runs SET budget_usd = ?, updated_at = ? WHERE id = ?")
    .run(newBudgetUsd, ts, runId);

  // Set status to running
  updateRunStatus(db, runId, "running");

  // Emit resume event
  createEvent(db, runId, "run-resumed", {
    previous_budget: run.budget_usd,
    new_budget: newBudgetUsd,
    cost_at_resume: run.cost_usd,
    resumed_from: "paused",
  });

  return { success: true };
}
