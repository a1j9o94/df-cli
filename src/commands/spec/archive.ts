import { Command } from "commander";
import { join } from "node:path";
import { findDfDir } from "../../utils/config.js";
import { getDb } from "../../db/index.js";
import { getSpec } from "../../db/queries/specs.js";
import { archiveSpec } from "../../db/queries/spec-lineage.js";
import { log } from "../../utils/logger.js";
import type { SqliteDb } from "../../db/index.js";
import type { SpecRecord } from "../../types/index.js";

/**
 * Core logic for archiving a spec. Testable without Commander.
 */
export function executeSpecArchive(db: SqliteDb, specId: string): SpecRecord {
  const spec = getSpec(db, specId);
  if (!spec) {
    throw new Error(`Spec not found: ${specId}`);
  }

  if (spec.status === "archived") {
    throw new Error(`Spec ${specId} is already archived`);
  }

  archiveSpec(db, specId);

  return getSpec(db, specId)!;
}

export const specArchiveCommand = new Command("archive")
  .description("Archive a specification (prevents further builds)")
  .argument("<spec-id>", "Specification ID to archive")
  .action(async (specId: string) => {
    const dfDir = findDfDir();
    if (!dfDir) {
      log.error("Not in a Dark Factory project. Run 'dark init' first.");
      process.exit(1);
    }

    const db = getDb(join(dfDir, "state.db"));

    try {
      const spec = executeSpecArchive(db, specId);
      log.success(`Archived spec: ${spec.id} (${spec.title})`);
      log.info("  This spec can no longer be built. To continue this work, create a follow-up:");
      log.info(`  dark spec create --from ${specId} "Follow-up: <description>"`);
    } catch (err) {
      log.error((err as Error).message);
      process.exit(1);
    }
  });
