import { Command } from "commander";
import { join } from "node:path";
import { findDfDir } from "../../utils/config.js";
import { getDb } from "../../db/index.js";
import { getAgentDetail } from "../../db/queries/agent-queries.js";
import { formatAgentDetail } from "../../utils/format-agent-detail.js";
import { formatJson } from "../../utils/format.js";
import { log } from "../../utils/logger.js";

export const agentShowCommand = new Command("show")
  .description("Show full detail for a single agent")
  .argument("<id>", "Agent ID")
  .option("--json", "Output as JSON")
  .action(async (id: string, options: { json?: boolean }) => {
    const dfDir = findDfDir();
    if (!dfDir) {
      log.error("Not in a Dark Factory project. Run 'df init' first.");
      process.exit(1);
    }

    const db = getDb(join(dfDir, "state.db"));
    const detail = getAgentDetail(db, id);

    if (!detail) {
      log.error(`Agent not found: ${id}`);
      process.exit(1);
    }

    if (options.json) {
      console.log(formatJson(detail, { excludeFields: ["system_prompt"] }));
      return;
    }

    console.log(formatAgentDetail(detail));
  });
