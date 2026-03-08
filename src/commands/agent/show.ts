import { Command } from "commander";
import { join } from "node:path";
import { findDfDir } from "../../utils/config.js";
import { getDb } from "../../db/index.js";
import { getAgentDetail } from "../../db/queries/agent-queries.js";
import { formatAgentDetail } from "../../utils/format-agent-detail.js";
import { formatJson } from "../../utils/format.js";
import { log } from "../../utils/logger.js";

/** Fields excluded from --json output by default */
const SHOW_EXCLUDED_FIELDS = ["system_prompt"];

export const agentShowCommand = new Command("show")
  .description("Show full detail for a single agent")
  .argument("<agent-id>", "Agent ID to show")
  .option("--json", "Output as JSON")
  .option("--verbose", "Include system_prompt in JSON output")
  .action(async (agentId: string, options: { json?: boolean; verbose?: boolean }) => {
    const dfDir = findDfDir();
    if (!dfDir) {
      log.error("Not in a Dark Factory project. Run 'df init' first.");
      process.exit(1);
    }

    const db = getDb(join(dfDir, "state.db"));
    const detail = getAgentDetail(db, agentId);

    if (!detail) {
      log.error(`Agent not found: ${agentId}`);
      process.exit(1);
    }

    if (options.json) {
      const excludeFields = options.verbose ? [] : SHOW_EXCLUDED_FIELDS;
      console.log(formatJson(detail, { excludeFields }));
      return;
    }

    console.log(formatAgentDetail(detail));
  });
