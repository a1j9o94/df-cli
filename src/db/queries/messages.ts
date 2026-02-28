import type { SqliteDb } from "../index.js";
import type { MessageRecord } from "../../types/index.js";
import { newMsgId } from "../../utils/id.js";

function now(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function toMessageRecord(row: Record<string, unknown>): MessageRecord {
  return { ...row, read: row.read === 1 } as unknown as MessageRecord;
}

export function createMessage(
  db: SqliteDb,
  runId: string,
  fromAgentId: string,
  body: string,
  options?: {
    toAgentId?: string;
    toRole?: string;
    toContractId?: string;
  },
): MessageRecord {
  const id = newMsgId();
  const ts = now();

  db.prepare(
    `INSERT INTO messages (id, run_id, from_agent_id, to_agent_id, to_role, to_contract_id, body, read, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`
  ).run(
    id,
    runId,
    fromAgentId,
    options?.toAgentId ?? null,
    options?.toRole ?? null,
    options?.toContractId ?? null,
    body,
    ts,
  );

  const row = db.prepare("SELECT * FROM messages WHERE id = ?").get(id) as Record<string, unknown>;
  return toMessageRecord(row);
}

export function getMessagesForAgent(
  db: SqliteDb,
  agentId: string,
  unreadOnly?: boolean,
): MessageRecord[] {
  const sql = unreadOnly
    ? "SELECT * FROM messages WHERE to_agent_id = ? AND read = 0 ORDER BY created_at"
    : "SELECT * FROM messages WHERE to_agent_id = ? ORDER BY created_at";
  const rows = db.prepare(sql).all(agentId) as Record<string, unknown>[];
  return rows.map(toMessageRecord);
}

export function getMessagesForRole(
  db: SqliteDb,
  runId: string,
  role: string,
  unreadOnly?: boolean,
): MessageRecord[] {
  const sql = unreadOnly
    ? "SELECT * FROM messages WHERE run_id = ? AND to_role = ? AND read = 0 ORDER BY created_at"
    : "SELECT * FROM messages WHERE run_id = ? AND to_role = ? ORDER BY created_at";
  const rows = db.prepare(sql).all(runId, role) as Record<string, unknown>[];
  return rows.map(toMessageRecord);
}

export function markMessageRead(db: SqliteDb, id: string): void {
  db.prepare("UPDATE messages SET read = 1 WHERE id = ?").run(id);
}

export function markAllReadForAgent(db: SqliteDb, agentId: string): void {
  db.prepare("UPDATE messages SET read = 1 WHERE to_agent_id = ? AND read = 0").run(agentId);
}
