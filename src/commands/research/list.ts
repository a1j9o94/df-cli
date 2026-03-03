import { Command } from "commander";
import { join } from "node:path";
import { findDfDir } from "../../utils/config.js";
import { getDb } from "../../db/index.js";
import { listResearchArtifacts } from "../../db/queries/research.js";
import { formatJson } from "../../utils/format.js";
import { log } from "../../utils/logger.js";

export const researchListCommand = new Command("list")
  .description("List research artifacts for a run")
  .requiredOption("--run-id <id>", "Run ID to list research for")
  .option("--module <module-id>", "Filter by module ID")
  .option("--json", "Output as JSON")
  .action(
    async (options: {
      runId: string;
      module?: string;
      json?: boolean;
    }) => {
      const dfDir = findDfDir();
      if (!dfDir) {
        log.error("Not in a Dark Factory project.");
        process.exit(1);
      }

      const db = getDb(join(dfDir, "state.db"));

      const artifacts = listResearchArtifacts(db, options.runId, {
        module_id: options.module,
      });

      if (options.json) {
        console.log(formatJson(artifacts));
      } else if (artifacts.length === 0) {
        log.info("No research artifacts found.");
      } else {
        for (const a of artifacts) {
          const moduleTag = a.module_id ? ` [${a.module_id}]` : "";
          const typeTag = a.type === "file" ? " (file)" : "";
          console.log(`  ${a.id}  ${a.label}${moduleTag}${typeTag}`);
        }
        log.info(`\n${artifacts.length} research artifact(s) found.`);
      }
    }
  );
