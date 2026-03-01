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
