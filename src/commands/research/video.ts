/**
 * `dark research video <agent-id> <url> [--question "<q>"] [--module <id>]`
 *
 * Fetch a video transcript (or ask a question about a video) using
 * llm-youtube, and save the result as a research artifact.
 *
 * The command does NOT validate URLs — it passes them directly to
 * llm-youtube, which handles YouTube, Loom, and any future formats.
 */

import { Command } from "commander";
import { join } from "node:path";
import { findDfDir } from "../../utils/config.js";
import { getDb } from "../../db/index.js";
import { getAgent } from "../../db/queries/agents.js";
import { log } from "../../utils/logger.js";
import { executeVideoResearch } from "./video-action.js";

export const researchVideoCommand = new Command("video")
  .description(
    "Fetch video transcript or ask a question about a video using llm-youtube"
  )
  .argument("<agent-id>", "Agent ID saving the research")
  .argument("<url>", "Video URL (YouTube, Loom, or any URL supported by llm-youtube)")
  .option("--question <question>", "Ask a question about the video instead of fetching raw transcript")
  .option("--module <module-id>", "Tag research to a specific module")
  .option("--json", "Output as JSON")
  .addHelpText(
    "after",
    `
Examples:

  Fetch transcript:
    $ dark research video <agent-id> https://www.youtube.com/watch?v=abc123

  Ask a question:
    $ dark research video <agent-id> https://www.youtube.com/watch?v=abc123 \\
        --question "What library does this tutorial use for auth?"

  Tag to a module:
    $ dark research video <agent-id> https://www.youtube.com/watch?v=abc123 \\
        --module my-module

  Loom video:
    $ dark research video <agent-id> https://www.loom.com/share/abc123def456
`
  )
  .action(
    async (
      agentId: string,
      url: string,
      options: {
        question?: string;
        module?: string;
        json?: boolean;
      }
    ) => {
      const dfDir = findDfDir();
      if (!dfDir) {
        log.error("Not in a Dark Factory project.");
        process.exit(1);
      }

      const db = getDb(join(dfDir, "state.db"));

      const agent = getAgent(db, agentId);
      if (!agent) {
        log.error(`Agent not found: ${agentId}`);
        process.exit(1);
      }

      try {
        const artifact = executeVideoResearch(db, agentId, {
          url,
          question: options.question,
          module: options.module,
        });

        if (options.json) {
          console.log(JSON.stringify(artifact, null, 2));
        } else {
          log.success(`Video research saved: ${artifact.id}`);
          log.info(`  Label: ${artifact.label}`);
          log.info(`  URL: ${url}`);
          if (options.question) {
            log.info(`  Mode: Q&A`);
          } else {
            log.info(`  Mode: Transcript`);
          }
          if (artifact.module_id) {
            log.info(`  Module: ${artifact.module_id}`);
          }
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : String(err);
        log.error(`Failed to fetch video research: ${message}`);
        process.exit(1);
      }
    }
  );
