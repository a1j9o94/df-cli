import type { SqliteDb } from "../index.js";
import type { EventType, EventRecord } from "../../types/index.js";
import { newEventId } from "../../utils/id.js";

function now(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function createEvent(
  db: SqliteDb,
  runId: string,
  type: EventType,
  data?: Record<string, unknown>,
  agentId?: string,
): EventRecord {
  const id = newEventId();
  const ts = now();

  db.prepare(
    `INSERT INTO events (id, run_id, agent_id, type, data, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, runId, agentId ?? null, type, data ? JSON.stringify(data) : null, ts);

  return db.prepare("SELECT * FROM events WHERE id = ?").get(id) as EventRecord;
}

export function listEvents(
  db: SqliteDb,
  runId: string,
  options?: {
    type?: EventType;
    agentId?: string;
    limit?: number;
  },
): EventRecord[] {
  const conditions = ["run_id = ?"];
  const params: string[] = [runId];

  if (options?.type) {
    conditions.push("type = ?");
    params.push(options.type);
  }
  if (options?.agentId) {
    conditions.push("agent_id = ?");
    params.push(options.agentId);
  }

  let sql = `SELECT * FROM events WHERE ${conditions.join(" AND ")} ORDER BY created_at DESC, rowid DESC`;
  if (options?.limit) {
    sql += ` LIMIT ${options.limit}`;
  }

  return db.prepare(sql).all(...params) as EventRecord[];
}

export function getLatestEvent(
  db: SqliteDb,
  runId: string,
  type: EventType,
): EventRecord | null {
  return db.prepare(
    "SELECT * FROM events WHERE run_id = ? AND type = ? ORDER BY created_at DESC, rowid DESC LIMIT 1"
  ).get(runId, type) as EventRecord | null;
}
