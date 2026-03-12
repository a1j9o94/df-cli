import { Command } from "commander";
import { join } from "node:path";
import { findDfDir } from "../../utils/config.js";
import { getDb } from "../../db/index.js";
import { listAgentsFiltered, getLatestAgentPerModule, getMostRecentRunId } from "../../db/queries/agent-queries.js";
import { formatAgentListEntry } from "../../utils/format-agent-list.js";
import { formatJson, AGENT_DEFAULT_EXCLUDED_FIELDS } from "../../utils/format.js";
import { summarizeAgentCounts } from "../../utils/agent-enrichment.js";
import { getWorktreeFilesChanged } from "../../utils/worktree-files.js";
import { isProcessAlive } from "../../utils/pid-check.js";
import { log } from "../../utils/logger.js";

export const agentListCommand = new Command("list")
  .description("List agents")
  .option("--run-id <id>", "Filter by run ID")
  .option("--role <role>", "Filter by role")
  .option("--active", "Only show agents with live PIDs")
  .option("--module <id>", "Filter by module ID")
  .option("--json", "Output as JSON")
  .option("--verbose", "Include system_prompt in JSON output")
  .action(async (options: {
    runId?: string;
    role?: string;
    active?: boolean;
    module?: string;
    json?: boolean;
    verbose?: boolean;
  }) => {
    const dfDir = findDfDir();
    if (!dfDir) {
      log.error("Not in a Dark Factory project. Run 'df init' first.");
      process.exit(1);
    }

    const db = getDb(join(dfDir, "state.db"));

    // Default behavior: when no --run-id is specified, auto-detect the most
    // recent run and show latest agent per module (deduplicating retries).
    // When --run-id is explicit, show all agents for that run.
    const hasExplicitRunId = !!options.runId;
    let runId = options.runId;
    if (!runId) {
      runId = getMostRecentRunId(db) ?? undefined;
    }

    let agents: ReturnType<typeof listAgentsFiltered>;

    if (!hasExplicitRunId && runId && !options.active && !options.role && !options.module) {
      // Default: latest agent per module from most recent run
      agents = getLatestAgentPerModule(db, runId);
    } else {
      agents = listAgentsFiltered(db, {
        runId,
        role: options.role,
        active: options.active,
        moduleId: options.module,
      });
    }

    // If --active is set, additionally filter by live PID
    if (options.active) {
      agents = agents.filter((a) => isProcessAlive(a.pid));
    }

    if (options.json) {
      const excludeFields = options.verbose ? [] : [...AGENT_DEFAULT_EXCLUDED_FIELDS];
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

    const counts = summarizeAgentCounts(agents);
    console.log(`Agents (${agents.length}: ${counts.summary}):\n`);

    for (const a of agents) {
      const filesChanged = getWorktreeFilesChanged(a.worktree_path);
      console.log(formatAgentListEntry(a, { filesChanged }));
    }
  });
