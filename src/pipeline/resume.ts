import type { SqliteDb } from "../db/index.js";
import type { PhaseName } from "./phases.js";
import { PHASE_ORDER } from "./phases.js";

export interface ResumeOptions {
  runId: string;
  fromPhase?: PhaseName;
  budgetUsd?: number;
}

export interface ResumableRun {
  id: string;
  spec_id: string;
  status: string;
  current_phase: string;
  created_at: string;
  error?: string;
}

/**
 * Returns runs eligible for resumption: failed runs, or running runs with no active agents.
 * Ordered by created_at DESC.
 */
export function getResumableRuns(db: SqliteDb): ResumableRun[] {
  // Get all resumable runs in one query:
  // failed runs OR running runs with no active agents
  const runs = db
    .prepare(
      `SELECT id, spec_id, status, current_phase, created_at, error
     FROM runs
     WHERE status = 'failed'
        OR (status = 'running' AND NOT EXISTS (
             SELECT 1 FROM agents a
             WHERE a.run_id = runs.id
               AND a.status IN ('pending', 'spawning', 'running')
           ))
     ORDER BY created_at DESC, rowid DESC`,
    )
    .all() as ResumableRun[];

  return runs;
}

/**
 * Determines which phase to resume from by scanning events for phase-completed entries.
 * Returns the first PhaseName in PHASE_ORDER without a phase-completed event.
 * Throws if all phases completed.
 */
export function getResumePoint(db: SqliteDb, runId: string): PhaseName {
  // Get all phase-completed events for this run
  const completedEvents = db
    .prepare(
      `SELECT data FROM events
     WHERE run_id = ? AND type = 'phase-completed'`,
    )
    .all(runId) as { data: string | null }[];

  const completedPhases = new Set<string>();
  for (const event of completedEvents) {
    if (event.data) {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.phase) {
          completedPhases.add(parsed.phase);
        }
      } catch {
        // Ignore malformed events
      }
    }
  }

  // Find first phase not completed
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
 */
export function getCompletedModules(db: SqliteDb, runId: string): Set<string> {
  const rows = db
    .prepare(
      `SELECT module_id FROM agents
     WHERE run_id = ?
       AND role = 'builder'
       AND status = 'completed'
       AND module_id IS NOT NULL`,
    )
    .all(runId) as { module_id: string }[];

  return new Set(rows.map((r) => r.module_id));
}
