import { Command } from "commander";
import { join } from "node:path";
import { findDfDir } from "../../utils/config.js";
import { getDb } from "../../db/index.js";
import { getAgent, updateAgentStatus } from "../../db/queries/agents.js";
import { createEvent } from "../../db/queries/events.js";
import { log } from "../../utils/logger.js";

export const agentFailCommand = new Command("fail")
  .description("Mark an agent as failed")
  .argument("<agent-id>", "Agent ID")
  .requiredOption("--error <description>", "Error description")
  .action(async (agentId: string, options: { error: string }) => {
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

    updateAgentStatus(db, agentId, "failed", options.error);
    createEvent(db, agent.run_id, "agent-failed", { error: options.error }, agentId);
    log.error(`Agent ${agentId} marked as failed: ${options.error}`);
  });
