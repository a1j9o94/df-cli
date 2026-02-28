import { Command } from "commander";
import { join } from "node:path";
import { findDfDir } from "../../utils/config.js";
import { getDb } from "../../db/index.js";
import { listSpecs } from "../../db/queries/specs.js";
import { formatJson, formatStatus } from "../../utils/format.js";
import { log } from "../../utils/logger.js";

export const specListCommand = new Command("list")
  .description("List all specifications")
  .option("--status <status>", "Filter by status")
  .option("--json", "Output as JSON")
  .action(async (options: { status?: string; json?: boolean }) => {
    const dfDir = findDfDir();
    if (!dfDir) {
      log.error("Not in a Dark Factory project. Run 'df init' first.");
      process.exit(1);
    }

    const db = getDb(join(dfDir, "state.db"));
    const specs = listSpecs(db, options.status);

    if (options.json) {
      console.log(formatJson(specs));
      return;
    }

    if (specs.length === 0) {
      console.log("No specs found. Create one with: df spec create <title>");
      return;
    }

    console.log(`Specs (${specs.length}):\n`);
    for (const spec of specs) {
      console.log(`  ${spec.id}  ${formatStatus(spec.status)}  ${spec.title}`);
    }
  });
