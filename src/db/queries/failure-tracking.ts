/**
 * Failure tracking queries — tracks builder retry attempts per module.
 *
 * Used by the build phase to decide whether to retry a failed module
 * or escalate to re-decomposition via the architect.
 *
 * Exports:
 *   getModuleAttemptCount(db, runId, moduleId): number
 *   getModuleFailedAttempts(db, runId, moduleId): AgentRecord[]
 *   shouldRedecompose(db, config, runId, moduleId): boolean
 */

import type { SqliteDb } from "../index.js";
import type { AgentRecord } from "../../types/index.js";
import type { DfConfig } from "../../types/config.js";

/** Statuses that count as failed attempts for redecomposition purposes. */
const FAILED_STATUSES = ["failed", "incomplete"];

/**
 * Count the number of failed builder attempts for a specific module in a run.
 *
 * Only counts agents with role='builder' and status in ('failed', 'incomplete').
 * Incomplete agents are those whose process exited with commits but without
 * calling `dark agent complete` — they represent a failed attempt that did
 * partial work.
 */
export function getModuleAttemptCount(
  db: SqliteDb,
  runId: string,
  moduleId: string,
): number {
  const placeholders = FAILED_STATUSES.map(() => "?").join(", ");
  const result = db
    .prepare(
      `SELECT COUNT(*) AS count FROM agents
       WHERE run_id = ?
         AND module_id = ?
         AND role = 'builder'
         AND status IN (${placeholders})`,
    )
    .get(runId, moduleId, ...FAILED_STATUSES) as { count: number };

  return result.count;
}

/**
 * Get all failed/incomplete builder agent records for a module, ordered
 * by creation time (oldest first).
 *
 * Useful for extracting error messages from previous attempts when
 * preparing the mini-architect prompt for re-decomposition.
 */
export function getModuleFailedAttempts(
  db: SqliteDb,
  runId: string,
  moduleId: string,
): AgentRecord[] {
  const placeholders = FAILED_STATUSES.map(() => "?").join(", ");
  return db
    .prepare(
      `SELECT * FROM agents
       WHERE run_id = ?
         AND module_id = ?
         AND role = 'builder'
         AND status IN (${placeholders})
       ORDER BY created_at ASC`,
    )
    .all(runId, moduleId, ...FAILED_STATUSES) as AgentRecord[];
}

/**
 * Determine whether a module should be re-decomposed instead of retried.
 *
 * Returns true when the number of failed attempts for the module meets
 * or exceeds the configured threshold (`config.build.max_module_retries`,
 * default: 2).
 *
 * When this returns true, the build phase should spawn a mini-architect
 * to break the module into smaller sub-modules rather than attempting
 * another retry with the same scope.
 */
export function shouldRedecompose(
  db: SqliteDb,
  config: DfConfig,
  runId: string,
  moduleId: string,
): boolean {
  const threshold = config.build.max_module_retries ?? 2;
  const count = getModuleAttemptCount(db, runId, moduleId);
  return count >= threshold;
}
