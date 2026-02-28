import type { SqliteDb } from "../index.js";
import type { BuildplanRecord, Buildplan } from "../../types/index.js";
import { newPlanId } from "../../utils/id.js";

function now(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function createBuildplan(
  db: SqliteDb,
  runId: string,
  specId: string,
  architectAgentId: string,
  planJson: string,
): BuildplanRecord {
  const id = newPlanId();
  const ts = now();
  const plan: Buildplan = JSON.parse(planJson);

  db.prepare(
    `INSERT INTO buildplans
       (id, run_id, spec_id, architect_agent_id, version, status, plan,
        module_count, contract_count, max_parallel, critical_path_modules,
        estimated_duration_min, estimated_cost_usd, estimated_tokens,
        created_at, updated_at)
     VALUES (?, ?, ?, ?, 1, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    runId,
    specId,
    architectAgentId,
    planJson,
    plan.modules.length,
    plan.contracts.length,
    plan.parallelism.max_concurrent,
    JSON.stringify(plan.parallelism.critical_path),
    plan.total_estimated_duration_min,
    plan.total_estimated_cost_usd,
    plan.total_estimated_tokens,
    ts,
    ts,
  );

  return getBuildplan(db, id)!;
}

export function getBuildplan(db: SqliteDb, id: string): BuildplanRecord | null {
  return db.prepare("SELECT * FROM buildplans WHERE id = ?").get(id) as BuildplanRecord | null;
}

export function getActiveBuildplan(db: SqliteDb, specId: string): BuildplanRecord | null {
  return db.prepare(
    "SELECT * FROM buildplans WHERE spec_id = ? AND status = 'active' ORDER BY version DESC LIMIT 1"
  ).get(specId) as BuildplanRecord | null;
}

export function listBuildplans(db: SqliteDb, runId?: string): BuildplanRecord[] {
  if (runId) {
    return db.prepare("SELECT * FROM buildplans WHERE run_id = ? ORDER BY version DESC").all(runId) as BuildplanRecord[];
  }
  return db.prepare("SELECT * FROM buildplans ORDER BY created_at DESC").all() as BuildplanRecord[];
}

export function updateBuildplanStatus(db: SqliteDb, id: string, status: string): void {
  db.prepare(
    "UPDATE buildplans SET status = ?, updated_at = ? WHERE id = ?"
  ).run(status, now(), id);
}

export function reviewBuildplan(
  db: SqliteDb,
  id: string,
  reviewedBy: string,
  notes?: string,
): void {
  db.prepare(
    "UPDATE buildplans SET reviewed_by = ?, review_notes = ?, updated_at = ? WHERE id = ?"
  ).run(reviewedBy, notes ?? null, now(), id);
}
