import { Command } from "commander";
import { join } from "node:path";
import { findDfDir } from "../../utils/config.js";
import { getDb } from "../../db/index.js";
import { getResource, setResourceCapacity, ensureResource } from "../../db/queries/resources.js";
import { log } from "../../utils/logger.js";

export const resourceSetCommand = new Command("set")
  .description("Set resource capacity")
  .argument("<resource-name>", "Resource name (e.g., worktrees, api_slots)")
  .requiredOption("--capacity <n>", "New capacity value")
  .action(async (resourceName: string, options: { capacity: string }) => {
    const dfDir = findDfDir();
    if (!dfDir) {
      log.error("Not in a Dark Factory project.");
      process.exit(1);
    }

    const db = getDb(join(dfDir, "state.db"));
    const capacity = parseInt(options.capacity, 10);

    if (isNaN(capacity) || capacity < 0) {
      log.error("Capacity must be a non-negative integer");
      process.exit(1);
    }

    // Ensure resource exists
    ensureResource(db, resourceName, capacity);
    setResourceCapacity(db, resourceName, capacity);

    const updated = getResource(db, resourceName)!;
    log.success(`Resource '${resourceName}' capacity set to ${updated.capacity}`);
    if (updated.in_use > updated.capacity) {
      log.warn(`Warning: ${updated.in_use} currently in use exceeds new capacity of ${updated.capacity}`);
    }
  });
