import type { SqliteDb } from "../index.js";
import type { AgentRecord, EventRecord, MessageRecord } from "../../types/index.js";

/**
 * Filter options for listing agents with enriched filtering capabilities.
 */
export interface AgentFilterOptions {
  /** Filter by run ID */
  runId?: string;
  /** Filter by role (e.g., "builder", "architect") */
  role?: string;
  /** Only show agents with active status (pending, spawning, running) */
  active?: boolean;
  /** Filter by module_id */
  moduleId?: string;
}

/**
 * Enriched agent detail returned by getAgentDetail.
 */
export interface AgentDetailResult {
  agent: AgentRecord;
  events: EventRecord[];
  messages: MessageRecord[];
}

const ACTIVE_STATUSES = ["pending", "spawning", "running"];

/**
 * List agents with flexible filtering: by run, role, active status, and module.
 * Supports combining multiple filters.
 */
export function listAgentsFiltered(db: SqliteDb, options: AgentFilterOptions = {}): AgentRecord[] {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (options.runId) {
    conditions.push("run_id = ?");
    params.push(options.runId);
  }

  if (options.role) {
    conditions.push("role = ?");
    params.push(options.role);
  }

  if (options.active) {
    const placeholders = ACTIVE_STATUSES.map(() => "?").join(", ");
    conditions.push(`status IN (${placeholders})`);
    params.push(...ACTIVE_STATUSES);
  }

  if (options.moduleId) {
    conditions.push("module_id = ?");
    params.push(options.moduleId);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const sql = `SELECT * FROM agents ${whereClause} ORDER BY created_at DESC`;

  return db.prepare(sql).all(...params) as AgentRecord[];
}

/**
 * Get the latest (most recently created) agent per module_id for a given run.
 * Useful for showing current state without historical retry attempts.
 * Agents without a module_id are included as-is.
 */
export function getLatestAgentPerModule(db: SqliteDb, runId: string): AgentRecord[] {
  // For agents with a module_id: get the one with the highest rowid per module (latest insert)
  // For agents without module_id (orchestrator, architect, etc.): include all
  const sql = `
    SELECT a.* FROM agents a
    INNER JOIN (
      SELECT COALESCE(module_id, id) AS group_key, MAX(rowid) AS max_rowid
      FROM agents
      WHERE run_id = ?
      GROUP BY COALESCE(module_id, id)
    ) latest ON a.rowid = latest.max_rowid
    WHERE a.run_id = ?
    ORDER BY a.created_at DESC
  `;

  return db.prepare(sql).all(runId, runId) as AgentRecord[];
}

/**
 * Get the ID of the most recently created run.
 * Returns null if no runs exist.
 */
export function getMostRecentRunId(db: SqliteDb): string | null {
  const row = db.prepare("SELECT id FROM runs ORDER BY rowid DESC LIMIT 1").get() as { id: string } | null;
  return row?.id ?? null;
}

function toMessageRecord(row: Record<string, unknown>): MessageRecord {
  return { ...row, read: row.read === 1 } as unknown as MessageRecord;
}

/**
 * Get full detail for a single agent, including recent events and messages.
 * Returns null if agent not found.
 */
export function getAgentDetail(db: SqliteDb, agentId: string): AgentDetailResult | null {
  const agent = db.prepare("SELECT * FROM agents WHERE id = ?").get(agentId) as AgentRecord | null;
  if (!agent) return null;

  // Get events for this agent (most recent first, limit 50)
  const events = db.prepare(
    "SELECT * FROM events WHERE agent_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 50"
  ).all(agentId) as EventRecord[];

  // Get messages to this agent (chronological, limit 50)
  const messageRows = db.prepare(
    "SELECT * FROM messages WHERE to_agent_id = ? ORDER BY created_at DESC LIMIT 50"
  ).all(agentId) as Record<string, unknown>[];

  const messages = messageRows.map(toMessageRecord);

  return { agent, events, messages };
}
