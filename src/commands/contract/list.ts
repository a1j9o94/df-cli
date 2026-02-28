import { Command } from "commander";
import { join } from "node:path";
import { findDfDir } from "../../utils/config.js";
import { getDb } from "../../db/index.js";
import { listContracts } from "../../db/queries/contracts.js";
import { formatJson } from "../../utils/format.js";
import { log } from "../../utils/logger.js";

export const contractListCommand = new Command("list")
  .description("List contracts")
  .option("--spec <spec-id>", "Filter by spec ID")
  .option("--run-id <id>", "Filter by run ID")
  .option("--json", "Output as JSON")
  .action(async (options: { spec?: string; runId?: string; json?: boolean }) => {
    const dfDir = findDfDir();
    if (!dfDir) {
      log.error("Not in a Dark Factory project.");
      process.exit(1);
    }

    const db = getDb(join(dfDir, "state.db"));
    const contracts = listContracts(db, options.runId);

    if (options.json) {
      console.log(formatJson(contracts));
      return;
    }

    if (contracts.length === 0) {
      console.log("No contracts found.");
      return;
    }

    console.log(`Contracts (${contracts.length}):\n`);
    for (const c of contracts) {
      console.log(`  ${c.id}  v${c.version}  ${c.name} (${c.format})`);
    }
  });
