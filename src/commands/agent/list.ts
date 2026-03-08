import { Command } from "commander";
import { join } from "node:path";
import { findDfDir } from "../../utils/config.js";
import { getDb } from "../../db/index.js";
import { listAgentsFiltered } from "../../db/queries/agent-queries.js";
import { formatAgentListEntry } from "../../utils/format-agent-list.js";
import { formatJson } from "../../utils/format.js";
import { log } from "../../utils/logger.js";

/** Fields excluded from --json output by default (large, rarely useful in list views) */
const AGENT_EXCLUDED_FIELDS = ["system_prompt"];

export const agentListCommand = new Command("list")
  .description("List agents")
  .option("--run-id <id>", "Filter by run ID")
  .option("--role <role>", "Filter by role")
  .option("--active", "Only show agents with active status (pending, spawning, running)")
  .option("--module <id>", "Filter by module ID")
  .option("--json", "Output as JSON")
  .option("--verbose", "Include system_prompt in JSON output")
  .action(async (options: { runId?: string; role?: string; active?: boolean; module?: string; json?: boolean; verbose?: boolean }) => {
    const dfDir = findDfDir();
    if (!dfDir) {
      log.error("Not in a Dark Factory project. Run 'df init' first.");
      process.exit(1);
    }

    const db = getDb(join(dfDir, "state.db"));

    const agents = listAgentsFiltered(db, {
      runId: options.runId,
      role: options.role,
      active: options.active,
      moduleId: options.module,
    });

    if (options.json) {
      const excludeFields = options.verbose ? [] : AGENT_EXCLUDED_FIELDS;
      console.log(formatJson(agents, { excludeFields }));
      return;
    }

    if (agents.length === 0) {
      if (options.active) {
        console.log("No active agents found.");
      } else {
        console.log("No agents found.");
      }
      return;
    }

    console.log(`Agents (${agents.length}):\n`);
    for (const a of agents) {
      console.log(formatAgentListEntry(a));
    }
  });
