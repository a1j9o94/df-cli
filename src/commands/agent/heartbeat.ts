import { Command } from "commander";
import { join } from "node:path";
import { findDfDir } from "../../utils/config.js";
import { getDb } from "../../db/index.js";
import { getAgent, updateAgentHeartbeat } from "../../db/queries/agents.js";
import { createEvent } from "../../db/queries/events.js";
import { log } from "../../utils/logger.js";

export const agentHeartbeatCommand = new Command("heartbeat")
  .description("Send a heartbeat for an agent")
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

    updateAgentHeartbeat(db, agentId);
    createEvent(db, agent.run_id, "agent-heartbeat", undefined, agentId);
  });
