import type { SqliteDb } from "../db/index.js";
import { PHASE_ORDER, type PhaseName } from "./phases.js";

/**
 * Data passed from the continue command to the engine resume method.
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
  const rows = db
    .prepare(`SELECT data FROM events WHERE run_id = ? AND type = 'phase-completed'`)
    .all(runId) as Array<{ data: string | null }>;

  // Extract the phase names from event data
  const completedPhases = new Set<string>();
  for (const row of rows) {
    if (row.data) {
      try {
        const parsed = JSON.parse(row.data);
        if (parsed.phase) {
          completedPhases.add(parsed.phase);
        }
      } catch {
        // Skip malformed data
      }
    }
  }

  // Find the first phase in PHASE_ORDER that hasn't completed
  for (const phase of PHASE_ORDER) {
    if (!completedPhases.has(phase)) {
      return phase;
    }
  }

  throw new Error(`All phases completed for run ${runId}. Nothing to resume.`);
}

/**
 * Returns module IDs for builders that completed successfully in a given run.
 * Queries agents WHERE run_id=? AND role='builder' AND status='completed',
 * returns Set of module_id.
 *
 * Contract: getCompletedModules
 */
export function getCompletedModules(db: SqliteDb, runId: string): Set<string> {
  const rows = db
    .prepare(
      `SELECT module_id FROM agents WHERE run_id = ? AND role = 'builder' AND status = 'completed' AND module_id IS NOT NULL`,
    )
    .all(runId) as Array<{ module_id: string }>;

  return new Set(rows.map((r) => r.module_id));
}

/**
 * Returns runs eligible for resumption: failed runs or running runs with no active agents.
 * Ordered by created_at DESC.
 *
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
  // Failed runs are always resumable.
  // Running runs are resumable only if they have no active agents
  // (pending, spawning, or running status).
  const rows = db
    .prepare(
      `SELECT r.id, r.spec_id, r.status, r.current_phase, r.created_at, r.error
       FROM runs r
       WHERE r.status = 'failed'
          OR (r.status = 'running' AND NOT EXISTS (
               SELECT 1 FROM agents a
               WHERE a.run_id = r.id
                 AND a.status IN ('pending', 'spawning', 'running')
             ))
       ORDER BY r.created_at DESC`,
    )
    .all() as Array<{
    id: string;
    spec_id: string;
    status: string;
    current_phase: string;
    created_at: string;
    error: string | null;
  }>;

  return rows.map((r) => ({
    id: r.id,
    spec_id: r.spec_id,
    status: r.status,
    current_phase: r.current_phase,
    created_at: r.created_at,
    ...(r.error != null ? { error: r.error } : {}),
  }));
}
