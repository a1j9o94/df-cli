import { Command } from "commander";
import { join } from "node:path";
import { findDfDir } from "../../utils/config.js";
import { getDb } from "../../db/index.js";
import { listEvents } from "../../db/queries/events.js";
import { listRuns } from "../../db/queries/runs.js";
import { formatJson, formatStatus } from "../../utils/format.js";
import { log } from "../../utils/logger.js";

export const integrateStatusCommand = new Command("status")
  .description("Show integration test status")
  .option("--run-id <id>", "Filter by run ID")
  .option("--json", "Output as JSON")
  .action(async (options: { runId?: string; json?: boolean }) => {
    const dfDir = findDfDir();
    if (!dfDir) {
      log.error("Not in a Dark Factory project.");
      process.exit(1);
    }

    const db = getDb(join(dfDir, "state.db"));

    // Get integration events
    const runs = options.runId ? [{ id: options.runId }] : listRuns(db);

    const integrationEvents = [];
    for (const run of runs) {
      const started = listEvents(db, run.id, { type: "integration-started" });
      const passed = listEvents(db, run.id, { type: "integration-passed" });
      const failed = listEvents(db, run.id, { type: "integration-failed" });

      for (const evt of [...started, ...passed, ...failed]) {
        integrationEvents.push({
          runId: run.id,
          type: evt.type,
          data: evt.data ? JSON.parse(evt.data) : null,
          timestamp: evt.created_at,
        });
      }
    }

    integrationEvents.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    if (options.json) {
      console.log(formatJson(integrationEvents));
      return;
    }

    if (integrationEvents.length === 0) {
      console.log("No integration tests found.");
      return;
    }

    console.log(`Integration events (${integrationEvents.length}):\n`);
    for (const evt of integrationEvents) {
      const status = evt.type.replace("integration-", "");
      console.log(`  ${evt.timestamp}  ${formatStatus(status)}  run=${evt.runId}`);
      if (evt.data) {
        const info = [];
        if (evt.data.checkpointsRun != null) info.push(`checkpoints: ${evt.data.checkpointsPassed}/${evt.data.checkpointsRun}`);
        if (info.length > 0) console.log(`    ${info.join(", ")}`);
      }
    }
  });
