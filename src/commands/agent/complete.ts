import { Command } from "commander";
import { join } from "node:path";
import { findDfDir } from "../../utils/config.js";
import { getDb } from "../../db/index.js";
import { getAgent, updateAgentStatus } from "../../db/queries/agents.js";
import { createEvent } from "../../db/queries/events.js";
import { log } from "../../utils/logger.js";

export const agentCompleteCommand = new Command("complete")
  .description("Mark an agent as completed")
  .argument("<agent-id>", "Agent ID")
  .action(async (agentId: string) => {
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

    updateAgentStatus(db, agentId, "completed");
    createEvent(db, agent.run_id, "agent-completed", undefined, agentId);
    log.success(`Agent ${agentId} marked as completed`);
  });
