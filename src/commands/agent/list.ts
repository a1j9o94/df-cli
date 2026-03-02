import { Command } from "commander";
import { join } from "node:path";
import { findDfDir } from "../../utils/config.js";
import { getDb } from "../../db/index.js";
import { listAgents } from "../../db/queries/agents.js";
import { formatJson, formatStatus } from "../../utils/format.js";
import { log } from "../../utils/logger.js";

/** Fields excluded from --json output by default (large, rarely useful in list views) */
const AGENT_EXCLUDED_FIELDS = ["system_prompt"];

export const agentListCommand = new Command("list")
  .description("List agents")
  .option("--run-id <id>", "Filter by run ID")
  .option("--role <role>", "Filter by role")
  .option("--json", "Output as JSON")
  .option("--verbose", "Include system_prompt in JSON output")
  .action(async (options: { runId?: string; role?: string; json?: boolean; verbose?: boolean }) => {
    const dfDir = findDfDir();
    if (!dfDir) {
      log.error("Not in a Dark Factory project. Run 'df init' first.");
      process.exit(1);
    }

    const db = getDb(join(dfDir, "state.db"));
    const agents = listAgents(db, options.runId, options.role);

    if (options.json) {
      const excludeFields = options.verbose ? [] : AGENT_EXCLUDED_FIELDS;
      console.log(formatJson(agents, { excludeFields }));
      return;
    }

    if (agents.length === 0) {
      console.log("No agents found.");
      return;
    }

    console.log(`Agents (${agents.length}):\n`);
    for (const a of agents) {
      const pid = a.pid ? ` pid=${a.pid}` : "";
      const mod = a.module_id ? ` module=${a.module_id}` : "";
      const cost = a.cost_usd > 0 ? ` $${a.cost_usd.toFixed(2)}` : "";
      console.log(`  ${a.id}  ${a.name} (${a.role})  ${formatStatus(a.status)}${pid}${mod}${cost}`);
    }
  });
