import type { SqliteDb } from "../index.js";
import type { RunRecord } from "../../types/index.js";

/**
 * Module progress entry for status display.
 */
export interface ModuleProgressEntry {
  moduleId: string;
  moduleTitle: string;
  status: string; // "pending" | agent status
  agentId: string | null;
  agentName: string | null;
  elapsedMs: number;
  costUsd: number;
}

/**
 * Run record enriched with spec title.
 */
export interface RunWithSpecTitle extends RunRecord {
  spec_title: string | null;
}

/**
 * Get per-module build progress for a run.
 * Reads module definitions from the active buildplan and joins with agent status.
 * Returns one entry per module defined in the buildplan.
 */
export function getModuleProgress(db: SqliteDb, runId: string): ModuleProgressEntry[] {
  // Get the active buildplan for this run
  const buildplan = db.prepare(
    "SELECT * FROM buildplans WHERE run_id = ? AND status = 'active' ORDER BY version DESC LIMIT 1"
  ).get(runId) as { plan: string } | null;

  if (!buildplan) return [];

  const plan = JSON.parse(buildplan.plan);
  const modules: Array<{ id: string; title: string }> = plan.modules ?? [];

  if (modules.length === 0) return [];

  // Get latest agent per module for this run
  const agents = db.prepare(
    `SELECT a.* FROM agents a
     INNER JOIN (
       SELECT module_id, MAX(rowid) AS max_rowid
       FROM agents
       WHERE run_id = ? AND module_id IS NOT NULL
       GROUP BY module_id
     ) latest ON a.rowid = latest.max_rowid
     WHERE a.run_id = ?`
  ).all(runId, runId) as Array<{
    id: string;
    name: string;
    module_id: string;
    status: string;
    created_at: string;
    cost_usd: number;
  }>;

  const agentByModule = new Map(agents.map(a => [a.module_id, a]));

  return modules.map(mod => {
    const agent = agentByModule.get(mod.id);
    const elapsedMs = agent
      ? Date.now() - new Date(agent.created_at).getTime()
      : 0;

    return {
      moduleId: mod.id,
      moduleTitle: mod.title,
      status: agent?.status ?? "pending",
      agentId: agent?.id ?? null,
      agentName: agent?.name ?? null,
      elapsedMs,
      costUsd: agent?.cost_usd ?? 0,
    };
  });
}

/**
 * Get a run record enriched with the spec title from the specs table.
 * Returns null if the run doesn't exist.
 * Returns spec_title as null if the spec is not in the specs table.
 */
export function getRunWithSpecTitle(db: SqliteDb, runId: string): RunWithSpecTitle | null {
  const row = db.prepare(
    `SELECT r.*, s.title AS spec_title
     FROM runs r
     LEFT JOIN specs s ON r.spec_id = s.id
     WHERE r.id = ?`
  ).get(runId) as RunWithSpecTitle | null;

  return row;
}
