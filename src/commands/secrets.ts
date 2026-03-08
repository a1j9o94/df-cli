import { Command } from "commander";
import { join } from "node:path";
import { findDfDir } from "../utils/config.js";
import { getDb } from "../db/index.js";
import { listBlockers } from "../db/queries/blockers.js";
import { isEncrypted } from "../utils/secrets.js";
import { log } from "../utils/logger.js";
import chalk from "chalk";

const secretsListCommand = new Command("list")
  .description("List stored secrets (names only, not values)")
  .option("--run-id <id>", "Filter by run ID")
  .option("--json", "Output as JSON")
  .action(async (options: { runId?: string; json?: boolean }) => {
    const dfDir = findDfDir();
    if (!dfDir) {
      log.error("Not in a Dark Factory project.");
      process.exit(1);
    }

    const db = getDb(join(dfDir, "state.db"));

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

    // Get all resolved secret-type blockers
    const allBlockers = listBlockers(db, runId);
    const secrets = allBlockers.filter(
      (b) => b.type === "secret" && b.status === "resolved" && b.resolved_value && isEncrypted(b.resolved_value)
    );

    if (options.json) {
      const output = secrets.map((s) => ({
        id: s.id,
        description: s.description,
        agent_id: s.agent_id,
        module_id: s.module_id,
        resolved_at: s.resolved_at,
      }));
      console.log(JSON.stringify(output, null, 2));
      return;
    }

    if (secrets.length === 0) {
      log.info("No secrets stored.");
      return;
    }

    console.log(`\n${chalk.bold("Stored Secrets")} (${secrets.length})\n`);
    for (const s of secrets) {
      console.log(`  ${chalk.bold(s.id)}`);
      console.log(`    Description: ${s.description}`);
      console.log(`    Agent:       ${s.agent_id}`);
      if (s.module_id) {
        console.log(`    Module:      ${s.module_id}`);
      }
      console.log(`    Resolved:    ${s.resolved_at}`);
      console.log(`    Value:       ${chalk.dim("[encrypted]")}`);
      console.log();
    }
  });

export const secretsCommand = new Command("secrets")
  .description("Manage secrets stored for agent blocker requests")
  .addCommand(secretsListCommand);
