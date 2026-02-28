import { Command } from "commander";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { findDfDir } from "../../utils/config.js";
import { getDb } from "../../db/index.js";
import { getSpec } from "../../db/queries/specs.js";
import { formatJson, formatStatus } from "../../utils/format.js";
import { log } from "../../utils/logger.js";

export const specShowCommand = new Command("show")
  .description("Show specification details")
  .argument("<spec-id>", "Specification ID")
  .option("--json", "Output as JSON")
  .action(async (specId: string, options: { json?: boolean }) => {
    const dfDir = findDfDir();
    if (!dfDir) {
      log.error("Not in a Dark Factory project. Run 'df init' first.");
      process.exit(1);
    }

    const db = getDb(join(dfDir, "state.db"));
    const spec = getSpec(db, specId);

    if (!spec) {
      log.error(`Spec not found: ${specId}`);
      process.exit(1);
    }

    if (options.json) {
      console.log(formatJson(spec));
      return;
    }

    console.log(`Spec: ${spec.id}`);
    console.log(`  Title:      ${spec.title}`);
    console.log(`  Status:     ${formatStatus(spec.status)}`);
    console.log(`  File:       ${spec.file_path}`);
    console.log(`  Scenarios:  ${spec.scenario_count}`);
    console.log(`  Created:    ${spec.created_at}`);

    // Show file contents
    try {
      const absPath = join(dfDir, spec.file_path);
      const content = readFileSync(absPath, "utf-8");
      console.log(`\n--- Content ---\n`);
      console.log(content);
    } catch {
      log.warn("Spec file not found on disk");
    }
  });
