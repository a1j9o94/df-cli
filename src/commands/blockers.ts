import { Command } from "commander";
import { join } from "node:path";
import { findDfDir } from "../utils/config.js";
import { getDb } from "../db/index.js";
import { listBlockers } from "../db/queries/blockers.js";
import { log } from "../utils/logger.js";
import chalk from "chalk";

export const blockersCommand = new Command("blockers")
  .description("List all pending blocker requests")
  .option("--run-id <id>", "Filter by run ID")
  .option("--all", "Show resolved blockers too")
  .option("--json", "Output as JSON")
  .action(async (options: { runId?: string; all?: boolean; json?: boolean }) => {
    const dfDir = findDfDir();
    if (!dfDir) {
      log.error("Not in a Dark Factory project.");
      process.exit(1);
    }

    const db = getDb(join(dfDir, "state.db"));

    // If no run-id, find the most recent run
    let runId = options.runId;
    if (!runId) {
      const latestRun = db.prepare(
        "SELECT id FROM runs ORDER BY created_at DESC LIMIT 1"
      ).get() as { id: string } | null;
      if (!latestRun) {
        log.info("No runs found.");
        return;
      }
      runId = latestRun.id;
    }

    const blockers = listBlockers(db, runId, { pendingOnly: !options.all });

    if (options.json) {
      console.log(JSON.stringify(blockers, null, 2));
      return;
    }

    if (blockers.length === 0) {
      log.info(options.all ? "No blockers found." : "No pending blockers.");
      return;
    }

    console.log(`\n${chalk.yellow.bold("⚠ Blocker Requests")} (${blockers.length})\n`);

    for (const b of blockers) {
      const typeColor = b.type === "secret" ? chalk.red : b.type === "decision" ? chalk.cyan : chalk.yellow;
      const statusColor = b.status === "pending" ? chalk.yellow : chalk.green;

      console.log(`  ${chalk.bold(b.id)}`);
      console.log(`    Type:        ${typeColor(b.type)}`);
      console.log(`    Status:      ${statusColor(b.status)}`);
      console.log(`    Agent:       ${b.agent_id}`);
      if (b.module_id) {
        console.log(`    Module:      ${b.module_id}`);
      }
      console.log(`    Description: ${b.description}`);
      console.log(`    Created:     ${b.created_at}`);
      if (b.status === "resolved") {
        console.log(`    Resolved:    ${b.resolved_at} by ${b.resolved_by}`);
      }
      if (b.status === "pending") {
        console.log(`    ${chalk.dim(`Resolve: dark agent resolve ${b.id} --value "<answer>"`)}`);
      }
      console.log();
    }
  });
