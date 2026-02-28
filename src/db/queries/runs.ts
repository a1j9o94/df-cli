import type { SqliteDb } from "../index.js";
import type { RunRecord, RunCreateInput } from "../../types/index.js";
import { newRunId } from "../../utils/id.js";

function now(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function createRun(db: SqliteDb, input: RunCreateInput): RunRecord {
  const id = newRunId();
  const mode = input.mode ?? "thorough";
  const maxParallel = input.max_parallel ?? 4;
  const budgetUsd = input.budget_usd ?? 50.0;
  const maxIterations = input.max_iterations ?? 3;
  const ts = now();

  db.prepare(
    `INSERT INTO runs (id, spec_id, status, mode, max_parallel, budget_usd, max_iterations, config, created_at, updated_at)
     VALUES (?, ?, 'pending', ?, ?, ?, ?, '{}', ?, ?)`
  ).run(id, input.spec_id, mode, maxParallel, budgetUsd, maxIterations, ts, ts);

  return getRun(db, id)!;
}

export function getRun(db: SqliteDb, id: string): RunRecord | null {
  return db.prepare("SELECT * FROM runs WHERE id = ?").get(id) as RunRecord | null;
}

export function listRuns(db: SqliteDb, specId?: string): RunRecord[] {
  if (specId) {
    return db.prepare("SELECT * FROM runs WHERE spec_id = ? ORDER BY created_at DESC").all(specId) as RunRecord[];
  }
  return db.prepare("SELECT * FROM runs ORDER BY created_at DESC").all() as RunRecord[];
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
