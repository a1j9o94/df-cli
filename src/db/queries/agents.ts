import type { SqliteDb } from "../index.js";
import type { AgentRecord, AgentSpawnConfig } from "../../types/index.js";
import { newAgentId } from "../../utils/id.js";

function now(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function createAgent(db: SqliteDb, config: AgentSpawnConfig): AgentRecord {
  const id = newAgentId();
  const ts = now();

  db.prepare(
    `INSERT INTO agents (id, run_id, role, name, status, module_id, buildplan_id, worktree_path, system_prompt, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    config.run_id,
    config.role,
    config.name,
    config.module_id ?? null,
    config.buildplan_id ?? null,
    config.worktree_path ?? null,
    config.system_prompt,
    ts,
    ts,
  );

  return getAgent(db, id)!;
}

export function getAgent(db: SqliteDb, id: string): AgentRecord | null {
  return db.prepare("SELECT * FROM agents WHERE id = ?").get(id) as AgentRecord | null;
}

export function listAgents(db: SqliteDb, runId?: string, role?: string): AgentRecord[] {
  if (runId && role) {
    return db.prepare("SELECT * FROM agents WHERE run_id = ? AND role = ? ORDER BY created_at DESC").all(runId, role) as AgentRecord[];
  }
  if (runId) {
    return db.prepare("SELECT * FROM agents WHERE run_id = ? ORDER BY created_at DESC").all(runId) as AgentRecord[];
  }
  if (role) {
    return db.prepare("SELECT * FROM agents WHERE role = ? ORDER BY created_at DESC").all(role) as AgentRecord[];
  }
  return db.prepare("SELECT * FROM agents ORDER BY created_at DESC").all() as AgentRecord[];
}

export function updateAgentStatus(db: SqliteDb, id: string, status: string, error?: string): void {
  db.prepare(
    "UPDATE agents SET status = ?, error = ?, updated_at = ? WHERE id = ?"
  ).run(status, error ?? null, now(), id);
}

export function updateAgentPid(db: SqliteDb, id: string, pid: number): void {
  db.prepare(
    "UPDATE agents SET pid = ?, status = 'running', updated_at = ? WHERE id = ?"
  ).run(pid, now(), id);
}

export function updateAgentHeartbeat(db: SqliteDb, id: string): void {
  const ts = now();
  db.prepare(
    "UPDATE agents SET last_heartbeat = ?, updated_at = ? WHERE id = ?"
  ).run(ts, ts, id);
}

export function updateAgentCost(db: SqliteDb, id: string, costUsd: number, tokensUsed: number): void {
  db.prepare(
    "UPDATE agents SET cost_usd = cost_usd + ?, tokens_used = tokens_used + ?, updated_at = ? WHERE id = ?"
  ).run(costUsd, tokensUsed, now(), id);
}

export function updateAgentTdd(db: SqliteDb, id: string, phase: string, cycles: number): void {
  db.prepare(
    "UPDATE agents SET tdd_phase = ?, tdd_cycles = ?, updated_at = ? WHERE id = ?"
  ).run(phase, cycles, now(), id);
}

export function getActiveAgents(db: SqliteDb, runId: string): AgentRecord[] {
  return db.prepare(
    "SELECT * FROM agents WHERE run_id = ? AND status IN ('pending', 'spawning', 'running') ORDER BY created_at"
  ).all(runId) as AgentRecord[];
}

export function getStaleAgents(db: SqliteDb, timeoutMs: number): AgentRecord[] {
  const cutoff = new Date(Date.now() - timeoutMs).toISOString().replace(/\.\d{3}Z$/, "Z");
  return db.prepare(
    `SELECT * FROM agents
     WHERE status = 'running'
       AND last_heartbeat IS NOT NULL
       AND last_heartbeat < ?
     ORDER BY last_heartbeat`
  ).all(cutoff) as AgentRecord[];
}
