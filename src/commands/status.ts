import { Command } from "commander";
import { findDfDir } from "../utils/config.js";
import { getDb } from "../db/index.js";
import { listRuns } from "../db/queries/runs.js";
import { getRunWithSpecTitle } from "../db/queries/status-queries.js";
import { formatJson, AGENT_DEFAULT_EXCLUDED_FIELDS } from "../utils/format.js";
import { formatStatusDetail, formatStatusSummaryLine } from "../utils/format-status-detail.js";
import { log } from "../utils/logger.js";
import { join } from "node:path";
import { getRunQueueInfo } from "../pipeline/queue-visibility.js";
import { checkDbHealth } from "../pipeline/db-health.js";
import { getModuleProgress } from "../db/queries/status-queries.js";
import { listAgents } from "../db/queries/agents.js";

export const statusCommand = new Command("status")
  .description("Show current pipeline status")
  .option("--run-id <id>", "Show status for a specific run")
  .option("--detail", "Show expanded detail view (phase timeline, cost breakdown by role)")
  .option("--json", "Output as JSON")
  .option("--verbose", "Include all fields in JSON output")
  .option("--restore", "Restore state DB from backup if corrupt")
  .action(async (options: { runId?: string; detail?: boolean; json?: boolean; verbose?: boolean; restore?: boolean }) => {
    const dfDir = findDfDir();
    if (!dfDir) {
      log.error("Not in a Dark Factory project. Run 'df init' first.");
      process.exit(1);
    }

    // Check DB health before attempting to read
    const healthCheck = checkDbHealth(dfDir);
    if (healthCheck.corrupt) {
      if (options.json) {
        console.log(formatJson({
          error: "state_db_corrupt",
          backupAvailable: healthCheck.backupAvailable,
          message: healthCheck.message,
        }));
      } else {
        log.error(healthCheck.message);
      }
      process.exit(1);
    }

    const db = getDb(join(dfDir, "state.db"));
    const runs = listRuns(db);
    const excludeFields = options.verbose ? [] : [...AGENT_DEFAULT_EXCLUDED_FIELDS];

    if (runs.length === 0) {
      if (options.json) {
        console.log(formatJson({ runs: [], message: "No runs found" }));
      } else {
        console.log("No runs found. Start one with: df build <spec-id>");
      }
      return;
    }

    // If a specific run is requested, show details
    if (options.runId || options.detail) {
      const targetRunId = options.runId ?? runs[0]?.id;
      if (!targetRunId) {
        log.error("No run found");
        process.exit(1);
      }

      const run = getRunWithSpecTitle(db, targetRunId);
      if (!run) {
        log.error(`Run ${targetRunId} not found`);
        process.exit(1);
      }

      if (options.json) {
        const agents = listAgents(db, run.id);
        const queueInfo = getRunQueueInfo(db, run.id);
        const moduleProgress = getModuleProgress(db, run.id);
        console.log(formatJson({ run, agents, mergeQueue: queueInfo, moduleProgress }, { excludeFields }));
        return;
      }

      console.log(formatStatusDetail(db, run, { detail: options.detail }));
      return;
    }

    // Show summary of all runs
    if (options.json) {
      console.log(formatJson({ runs }, { excludeFields }));
      return;
    }

    console.log(`Runs (${runs.length}):\n`);
    for (const run of runs) {
      const enrichedRun = getRunWithSpecTitle(db, run.id);
      if (enrichedRun) {
        console.log(formatStatusSummaryLine(db, enrichedRun));
      }
    }
  });
