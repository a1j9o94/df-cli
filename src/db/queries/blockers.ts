import type { SqliteDb } from "../index.js";
import type { BlockerRecord, BlockerType, BlockerStatus } from "../../types/blocker.js";
import { newBlockerId } from "../../utils/id.js";

function now(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function createBlocker(
  db: SqliteDb,
  blocker: {
    run_id: string;
    agent_id: string;
    module_id?: string;
    type: BlockerType;
    description: string;
  }
): BlockerRecord {
  const id = newBlockerId();
  const ts = now();

  db.prepare(
    `INSERT INTO blocker_requests (id, run_id, agent_id, module_id, type, description, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
  ).run(
    id,
    blocker.run_id,
    blocker.agent_id,
    blocker.module_id ?? null,
    blocker.type,
    blocker.description,
    ts,
    ts
  );

  return getBlocker(db, id)!;
}

export function resolveBlocker(
  db: SqliteDb,
  id: string,
  resolution: { value?: string; resolved_by: string }
): BlockerRecord {
  const ts = now();

  db.prepare(
    `UPDATE blocker_requests
     SET status = 'resolved', resolved_value = ?, resolved_by = ?, resolved_at = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    resolution.value ?? null,
    resolution.resolved_by,
    ts,
    ts,
    id
  );

  return getBlocker(db, id)!;
}

export function getBlocker(db: SqliteDb, id: string): BlockerRecord | null {
  return db.prepare("SELECT * FROM blocker_requests WHERE id = ?").get(id) as BlockerRecord | null;
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

export function listBlockersByAgent(
  db: SqliteDb,
  agentId: string
): BlockerRecord[] {
  return db.prepare(
    "SELECT * FROM blocker_requests WHERE agent_id = ? ORDER BY created_at"
  ).all(agentId) as BlockerRecord[];
}
