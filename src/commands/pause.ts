import { join } from "node:path";
import { Command } from "commander";
import { getDb } from "../db/index.js";
import type { SqliteDb } from "../db/index.js";
import { getRun, updateRunStatus } from "../db/queries/runs.js";
import { createEvent } from "../db/queries/events.js";
import type { RunRecord } from "../types/run.js";
import { findDfDir } from "../utils/config.js";
import { log } from "../utils/logger.js";

/**
 * Validate that a run exists and can be paused.
 * Only running runs can be paused.
 * Contract: PauseStateContract
 */
export function validatePauseRun(
  db: SqliteDb,
  runId: string,
): { valid: boolean; error?: string } {
  const run = getRun(db, runId);
  if (!run) {
    return { valid: false, error: `Run not found: ${runId}` };
  }
  if (run.status === "paused") {
    return { valid: false, error: `Run ${runId} is already paused.` };
  }
  if (run.status !== "running" && run.status !== "pending") {
    return {
      valid: false,
      error: `Run ${runId} is not pausable (status: ${run.status}). Only running runs can be paused.`,
    };
  }
  return { valid: true };
}

/**
 * Get the most recent running run (for `dark pause` without a run-id).
 * Contract: PauseSequenceContract
 */
export function getPausableRun(db: SqliteDb): RunRecord | null {
  const row = db.prepare(
    `SELECT * FROM runs WHERE status = 'running' ORDER BY created_at DESC LIMIT 1`
  ).get() as Record<string, unknown> | null;
  if (!row) return null;
  return {
    ...row,
    skip_change_eval: row.skip_change_eval === 1,
  } as RunRecord;
}

export const pauseCommand = new Command("pause")
  .description("Manually pause a running build")
  .argument("[run-id]", "Run ID to pause (defaults to most recent active run)")
  .action(
    async (runIdArg: string | undefined) => {
      const dfDir = findDfDir();
      if (!dfDir) {
        log.error("Not in a Dark Factory project. Run 'dark init' first.");
        process.exit(1);
      }

      const db = getDb(join(dfDir, "state.db"));

      // Resolve run ID
      let runId = runIdArg;
      if (!runId) {
        const run = getPausableRun(db);
        if (!run) {
          log.error("No running builds found to pause.");
          process.exit(1);
        }
        runId = run.id;
        log.info(`Auto-selected run: ${runId}`);
      }

      // Validate
      const validation = validatePauseRun(db, runId);
      if (!validation.valid) {
        log.error(validation.error!);
        process.exit(1);
      }

      // Pause the run
      updateRunStatus(db, runId, "paused", "manual");
      createEvent(db, runId, "run-paused", { reason: "manual" });

      console.log(`[dark] Run ${runId} paused manually. Resume with: dark continue ${runId}`);
    },
  );
