import { Command } from "commander";
import { join } from "node:path";
import { findDfDir } from "../../utils/config.js";
import { getDb } from "../../db/index.js";
import { getResearchArtifact } from "../../db/queries/research.js";
import { formatJson } from "../../utils/format.js";
import { log } from "../../utils/logger.js";

export const researchShowCommand = new Command("show")
  .description("Show the content of a research artifact")
  .argument("<research-id>", "Research artifact ID")
  .option("--json", "Output as JSON")
  .action(
    async (
      researchId: string,
      options: {
        json?: boolean;
      }
    ) => {
      const dfDir = findDfDir();
      if (!dfDir) {
        log.error("Not in a Dark Factory project.");
        process.exit(1);
      }

      const db = getDb(join(dfDir, "state.db"));
      const artifact = getResearchArtifact(db, researchId);

      if (!artifact) {
        log.error(`Research artifact not found: ${researchId}`);
        process.exit(1);
      }

      if (options.json) {
        console.log(formatJson(artifact));
      } else {
        console.log(`ID:       ${artifact.id}`);
        console.log(`Label:    ${artifact.label}`);
        console.log(`Type:     ${artifact.type}`);
        console.log(`Agent:    ${artifact.agent_id}`);
        console.log(`Run:      ${artifact.run_id}`);
        if (artifact.module_id) {
          console.log(`Module:   ${artifact.module_id}`);
        }
        console.log(`Created:  ${artifact.created_at}`);
        console.log();
        if (artifact.type === "text" && artifact.content) {
          console.log(artifact.content);
        } else if (artifact.type === "file" && artifact.file_path) {
          console.log(`File: ${artifact.file_path}`);
        }
      }
    }
  );
