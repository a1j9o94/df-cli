import type { SqliteDb } from "../index.js";
import type { RunRecord, RunCreateInput } from "../../types/index.js";
import { newRunId } from "../../utils/id.js";

function now(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

/** Convert SQLite integer (0/1) to boolean for skip_change_eval */
function hydrateRun(row: Record<string, unknown>): RunRecord {
  return {
    ...row,
    skip_change_eval: row.skip_change_eval === 1,
    paused_at: (row.paused_at as string) ?? null,
    pause_reason: (row.pause_reason as string) ?? null,
  } as RunRecord;
}

export function createRun(db: SqliteDb, input: RunCreateInput): RunRecord {
  const id = newRunId();
  const skipChangeEval = input.skip_change_eval ? 1 : 0;
  const maxParallel = input.max_parallel ?? 4;
  const budgetUsd = input.budget_usd ?? 50.0;
  const maxIterations = input.max_iterations ?? 3;
  const ts = now();

  db.prepare(
    `INSERT INTO runs (id, spec_id, status, skip_change_eval, max_parallel, budget_usd, max_iterations, config, created_at, updated_at)
     VALUES (?, ?, 'pending', ?, ?, ?, ?, '{}', ?, ?)`
  ).run(id, input.spec_id, skipChangeEval, maxParallel, budgetUsd, maxIterations, ts, ts);

  return getRun(db, id)!;
}

export function getRun(db: SqliteDb, id: string): RunRecord | null {
  const row = db.prepare("SELECT * FROM runs WHERE id = ?").get(id) as Record<string, unknown> | null;
  if (!row) return null;
  return hydrateRun(row);
}

export function listRuns(db: SqliteDb, specId?: string): RunRecord[] {
  const rows = specId
    ? db.prepare("SELECT * FROM runs WHERE spec_id = ? ORDER BY created_at DESC").all(specId)
    : db.prepare("SELECT * FROM runs ORDER BY created_at DESC").all();
  return (rows as Record<string, unknown>[]).map(hydrateRun);
}

export function updateRunStatus(db: SqliteDb, id: string, status: string, error?: string): void {
  db.prepare(
    "UPDATE runs SET status = ?, error = ?, updated_at = ? WHERE id = ?"
  ).run(status, error ?? null, now(), id);
}

export function updateRunPhase(db: SqliteDb, id: string, phase: string): void {
  db.prepare(
    "UPDATE runs SET current_phase = ?, updated_at = ? WHERE id = ?"
  ).run(phase, now(), id);
}

export function updateRunCost(db: SqliteDb, id: string, costUsd: number, tokensUsed: number): void {
  db.prepare(
    "UPDATE runs SET cost_usd = cost_usd + ?, tokens_used = tokens_used + ?, updated_at = ? WHERE id = ?"
  ).run(costUsd, tokensUsed, now(), id);
}

export function incrementRunIteration(db: SqliteDb, id: string): void {
  db.prepare(
    "UPDATE runs SET iteration = iteration + 1, updated_at = ? WHERE id = ?"
  ).run(now(), id);
}
