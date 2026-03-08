import type { SqliteDb } from "../index.js";
import type { BlockerRecord, BlockerCreateInput, BlockerType, BlockerStatus } from "../../types/blocker.js";
import { newBlockerId } from "../../utils/id.js";

function now(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function createBlocker(db: SqliteDb, input: BlockerCreateInput): BlockerRecord {
  const id = newBlockerId();
  const ts = now();

  db.prepare(
    `INSERT INTO blocker_requests (id, run_id, agent_id, module_id, type, description, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
  ).run(id, input.run_id, input.agent_id, input.module_id ?? null, input.type, input.description, ts, ts);

  return getBlocker(db, id)!;
}

export function getBlocker(db: SqliteDb, id: string): BlockerRecord | null {
  return db.prepare("SELECT * FROM blocker_requests WHERE id = ?").get(id) as BlockerRecord | null;
}

export function listBlockers(
  db: SqliteDb,
  runId: string,
  options?: { pendingOnly?: boolean },
): BlockerRecord[] {
  if (options?.pendingOnly) {
    return db.prepare(
      "SELECT * FROM blocker_requests WHERE run_id = ? AND status = 'pending' ORDER BY created_at ASC"
    ).all(runId) as BlockerRecord[];
  }
  return db.prepare(
    "SELECT * FROM blocker_requests WHERE run_id = ? ORDER BY created_at ASC"
  ).all(runId) as BlockerRecord[];
}

export function listBlockersByRun(
  db: SqliteDb,
  runId: string,
  status?: BlockerStatus
): BlockerRecord[] {
  if (status) {
    return db.prepare(
      "SELECT * FROM blocker_requests WHERE run_id = ? AND status = ? ORDER BY created_at"
    ).all(runId, status) as BlockerRecord[];
  }
  return db.prepare(
    "SELECT * FROM blocker_requests WHERE run_id = ? ORDER BY created_at"
  ).all(runId) as BlockerRecord[];
}

export function resolveBlocker(
  db: SqliteDb,
  id: string,
  value: string,
  resolvedBy: string,
): void {
  const ts = now();
  db.prepare(
    "UPDATE blocker_requests SET status = 'resolved', resolved_value = ?, resolved_at = ?, resolved_by = ?, updated_at = ? WHERE id = ?"
  ).run(value, ts, resolvedBy, ts, id);
}

export function getBlockersForAgent(db: SqliteDb, agentId: string): BlockerRecord[] {
  return db.prepare(
    "SELECT * FROM blocker_requests WHERE agent_id = ? ORDER BY created_at ASC"
  ).all(agentId) as BlockerRecord[];
}

export function listBlockersByAgent(
  db: SqliteDb,
  agentId: string
): BlockerRecord[] {
  return db.prepare(
    "SELECT * FROM blocker_requests WHERE agent_id = ? ORDER BY created_at"
  ).all(agentId) as BlockerRecord[];
}
