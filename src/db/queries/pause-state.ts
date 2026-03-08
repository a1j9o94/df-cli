import type { SqliteDb } from "../index.js";
import type { RunRecord, PauseReason } from "../../types/index.js";

function now(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

/** Hydrate a run row from SQLite */
function hydrateRun(row: Record<string, unknown>): RunRecord {
  return {
    ...row,
    skip_change_eval: row.skip_change_eval === 1,
    paused_at: (row.paused_at as string) ?? null,
    pause_reason: (row.pause_reason as string) ?? null,
  } as RunRecord;
}

export interface RunPauseState {
  pause_reason: PauseReason;
  paused_at: string;
  cost_usd: number;
  budget_usd: number;
}

/**
 * Pause a run: set status to 'paused', record timestamp and reason.
 */
export function pauseRun(db: SqliteDb, runId: string, reason: PauseReason): void {
  const ts = now();
  db.prepare(
    "UPDATE runs SET status = 'paused', paused_at = ?, pause_reason = ?, updated_at = ? WHERE id = ?"
  ).run(ts, reason, ts, runId);
}

/**
 * Resume a paused run: validate state, set new budget, clear pause fields.
 * Throws if run is not paused or new budget doesn't exceed current spend.
 */
export function resumeRun(db: SqliteDb, runId: string, newBudgetUsd: number): void {
  const row = db.prepare("SELECT * FROM runs WHERE id = ?").get(runId) as Record<string, unknown> | null;
  if (!row) {
    throw new Error(`Run not found: ${runId}`);
  }
  if (row.status !== "paused") {
    throw new Error(`Run ${runId} is not paused (status: ${row.status})`);
  }
  const currentSpend = row.cost_usd as number;
  if (newBudgetUsd <= currentSpend) {
    throw new Error(
      `New budget ($${newBudgetUsd}) must exceed current spend ($${currentSpend}).`
    );
  }
  const ts = now();
  db.prepare(
    "UPDATE runs SET status = 'running', paused_at = NULL, pause_reason = NULL, budget_usd = ?, updated_at = ? WHERE id = ?"
  ).run(newBudgetUsd, ts, runId);
}

/**
 * Get all paused runs.
 */
export function getPausedRuns(db: SqliteDb): RunRecord[] {
  const rows = db
    .prepare("SELECT * FROM runs WHERE status = 'paused' ORDER BY created_at DESC")
    .all() as Record<string, unknown>[];
  return rows.map(hydrateRun);
}

/**
 * Get pause state for a specific run. Returns null if the run is not paused.
 */
export function getRunPauseState(db: SqliteDb, runId: string): RunPauseState | null {
  const row = db.prepare("SELECT * FROM runs WHERE id = ? AND status = 'paused'").get(runId) as Record<string, unknown> | null;
  if (!row) return null;
  return {
    pause_reason: row.pause_reason as PauseReason,
    paused_at: row.paused_at as string,
    cost_usd: row.cost_usd as number,
    budget_usd: row.budget_usd as number,
  };
}
