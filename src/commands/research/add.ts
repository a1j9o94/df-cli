import { Command } from "commander";
import { existsSync, copyFileSync, mkdirSync } from "node:fs";
import { join, basename } from "node:path";
import { findDfDir } from "../../utils/config.js";
import { getDb } from "../../db/index.js";
import { formatJson } from "../../utils/format.js";
import { getAgent } from "../../db/queries/agents.js";
import { createResearchArtifact } from "../../db/queries/research.js";
import { log } from "../../utils/logger.js";

export const researchAddCommand = new Command("add")
  .description(
    "Save a research finding (URL, code snippet, API docs, screenshot)"
  )
  .argument("<agent-id>", "Agent ID saving the research")
  .requiredOption("--label <label>", "Short label for the research artifact")
  .option("--content <content>", "Text content (URL, snippet, notes)")
  .option("--file <path>", "Path to a file (screenshot, doc, etc.)")
  .option("--module <module-id>", "Tag research to a specific module")
  .option("--json", "Output as JSON")
  .action(
    async (
      agentId: string,
      options: {
        label: string;
        content?: string;
        file?: string;
        module?: string;
        json?: boolean;
      }
    ) => {
      const dfDir = findDfDir();
      if (!dfDir) {
        log.error("Not in a Dark Factory project.");
        process.exit(1);
      }

      if (!options.content && !options.file) {
        log.error(
          "Must provide either --content or --file"
        );
        process.exit(1);
      }

      if (options.content && options.file) {
        log.error("Provide either --content or --file, not both");
        process.exit(1);
      }

      const db = getDb(join(dfDir, "state.db"));
      const agent = getAgent(db, agentId);

      if (!agent) {
        log.error(`Agent not found: ${agentId}`);
        process.exit(1);
      }

      let filePath: string | undefined;

      if (options.file) {
        // Verify source file exists
        if (!existsSync(options.file)) {
          log.error(`File not found: ${options.file}`);
          process.exit(1);
        }

        // Copy file to .df/research/<run-id>/
        const researchDir = join(dfDir, "research", agent.run_id);
        mkdirSync(researchDir, { recursive: true });

        const destFile = join(researchDir, basename(options.file));
        copyFileSync(options.file, destFile);
        filePath = destFile;
      }

      const artifact = createResearchArtifact(db, {
        run_id: agent.run_id,
        agent_id: agentId,
        label: options.label,
        type: options.file ? "file" : "text",
        content: options.content,
        file_path: filePath,
        module_id: options.module,
      });

      if (options.json) {
        console.log(formatJson(artifact));
      } else {
        log.success(`Research saved: ${artifact.id}`);
        log.info(`  Label: ${artifact.label}`);
        log.info(`  Type: ${artifact.type}`);
        if (artifact.module_id) {
          log.info(`  Module: ${artifact.module_id}`);
        }
        if (artifact.file_path) {
          log.info(`  File: ${artifact.file_path}`);
        }
      }
    }
  );
