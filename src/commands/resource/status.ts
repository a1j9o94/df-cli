import { Command } from "commander";
import { join } from "node:path";
import { findDfDir } from "../../utils/config.js";
import { getDb } from "../../db/index.js";
import { listResources, ensureResource } from "../../db/queries/resources.js";
import { getConfig } from "../../utils/config.js";
import { formatJson } from "../../utils/format.js";
import { log } from "../../utils/logger.js";

export const resourceStatusCommand = new Command("status")
  .description("Show resource availability")
  .option("--json", "Output as JSON")
  .action(async (options: { json?: boolean }) => {
    const dfDir = findDfDir();
    if (!dfDir) {
      log.error("Not in a Dark Factory project.");
      process.exit(1);
    }

    const db = getDb(join(dfDir, "state.db"));
    const config = getConfig(dfDir);

    // Ensure default resources exist
    ensureResource(db, "worktrees", config.resources.max_worktrees);
    ensureResource(db, "api_slots", config.resources.max_api_slots);

    const resources = listResources(db);

    if (options.json) {
      console.log(formatJson(resources));
      return;
    }

    console.log("Resources:\n");
    for (const r of resources) {
      const pct = r.capacity > 0 ? Math.round((r.in_use / r.capacity) * 100) : 0;
      const bar = renderBar(r.in_use, r.capacity, 20);
      console.log(`  ${r.name.padEnd(15)} ${bar}  ${r.in_use}/${r.capacity} (${pct}%)`);
    }
  });

function renderBar(used: number, total: number, width: number): string {
  if (total === 0) return "[" + ".".repeat(width) + "]";
  const filled = Math.round((used / total) * width);
  return "[" + "#".repeat(filled) + ".".repeat(width - filled) + "]";
}
