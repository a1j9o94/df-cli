import type { SqliteDb } from "../db/index.js";
import { listEvents } from "../db/queries/events.js";
import { PHASE_ORDER } from "./phases.js";
import type { PhaseName } from "./phases.js";

/**
 * Data passed from continue command to engine resume method.
 * Contract: ResumeOptions
 */
export interface ResumeOptions {
  runId: string;
  fromPhase?: PhaseName;
  budgetUsd?: number;
}

/**
 * Determines which phase to resume from by scanning events for phase-completed entries.
 * Returns the first PhaseName in PHASE_ORDER without a phase-completed event.
 * Throws if all phases completed.
 *
 * Contract: getResumePoint
 */
export function getResumePoint(db: SqliteDb, runId: string): PhaseName {
  // Get all phase-completed events for this run
  const events = listEvents(db, runId, { type: "phase-completed" });

  // Build a set of completed phases
  const completedPhases = new Set<string>();
  for (const event of events) {
    if (event.data) {
      try {
        const data = JSON.parse(event.data);
        if (data.phase) {
          completedPhases.add(data.phase);
        }
      } catch {
        // skip malformed event data
      }
    }
  }

  // Find the first phase that hasn't been completed
  for (const phase of PHASE_ORDER) {
    if (!completedPhases.has(phase)) {
      return phase;
    }
  }

  throw new Error(`All phases completed for run ${runId} — nothing to resume`);
}

/**
 * Returns module IDs for builders that completed successfully in a given run.
 * Queries agents WHERE run_id=? AND role=builder AND status=completed, returns Set of module_id.
 *
 * Contract: getCompletedModules
 */
export function getCompletedModules(db: SqliteDb, runId: string): Set<string> {
  const rows = db.prepare(
    "SELECT module_id FROM agents WHERE run_id = ? AND role = 'builder' AND status = 'completed' AND module_id IS NOT NULL"
  ).all(runId) as { module_id: string }[];

  return new Set(rows.map((r) => r.module_id));
}

/**
 * Returns the worktree path from the most recent failed builder for a given module.
 * Used by the resume build phase to reuse worktrees that may contain partial work
 * (commits from a previous failed builder attempt).
 *
 * Returns null if no failed builder exists for this module, or if the builder
 * had no worktree_path recorded.
 *
 * Contract: getFailedBuilderWorktree
 */
export function getFailedBuilderWorktree(db: SqliteDb, runId: string, moduleId: string): string | null {
  const row = db.prepare(
    `SELECT worktree_path FROM agents
     WHERE run_id = ? AND role = 'builder' AND module_id = ? AND status = 'failed'
       AND worktree_path IS NOT NULL
     ORDER BY rowid DESC
     LIMIT 1`
  ).get(runId, moduleId) as { worktree_path: string } | undefined;

  return row?.worktree_path ?? null;
}

/**
 * Returns runs eligible for resumption: failed runs or running runs with no active agents.
 * Contract: getResumableRuns
 */
export function getResumableRuns(db: SqliteDb): Array<{
  id: string;
  spec_id: string;
  status: string;
  current_phase: string;
  created_at: string;
  error?: string;
}> {
  const rows = db.prepare(
    `SELECT r.id, r.spec_id, r.status, r.current_phase, r.created_at, r.error
     FROM runs r
     WHERE r.status = 'failed'
        OR (r.status = 'running' AND NOT EXISTS (
             SELECT 1 FROM agents a
             WHERE a.run_id = r.id
               AND a.status IN ('pending', 'spawning', 'running')
           ))
     ORDER BY r.created_at DESC`
  ).all() as Array<{
    id: string; spec_id: string; status: string;
    current_phase: string; created_at: string; error: string | null;
  }>;

  return rows.map((r) => ({
    id: r.id, spec_id: r.spec_id, status: r.status,
    current_phase: r.current_phase, created_at: r.created_at,
    ...(r.error != null ? { error: r.error } : {}),
  }));
}
