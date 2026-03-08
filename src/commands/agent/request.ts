import { Command } from "commander";
import { join } from "node:path";
import { findDfDir } from "../../utils/config.js";
import { getDb } from "../../db/index.js";
import { getAgent, updateAgentStatus, getActiveAgents } from "../../db/queries/agents.js";
import { createBlocker } from "../../db/queries/blockers.js";
import { createEvent } from "../../db/queries/events.js";
import { pauseRun } from "../../db/queries/pause-state.js";
import { log } from "../../utils/logger.js";
import type { BlockerType } from "../../types/blocker.js";

const VALID_TYPES: BlockerType[] = ["secret", "access", "decision", "resource"];

export const agentRequestCommand = new Command("request")
  .description("Raise a blocker request — pause until the user provides a missing resource")
  .argument("<agent-id>", "Agent ID raising the blocker")
  .requiredOption("--type <type>", "Blocker type: secret, access, decision, or resource")
  .requiredOption("--description <text>", "What the agent needs")
  .action(async (agentId: string, options: { type: string; description: string }) => {
    const dfDir = findDfDir();
    if (!dfDir) {
      log.error("Not in a Dark Factory project.");
      process.exit(1);
    }

    if (!VALID_TYPES.includes(options.type as BlockerType)) {
      log.error(`Invalid blocker type: ${options.type}. Must be one of: ${VALID_TYPES.join(", ")}`);
      process.exit(1);
    }

    const db = getDb(join(dfDir, "state.db"));
    const agent = getAgent(db, agentId);

    if (!agent) {
      log.error(`Agent not found: ${agentId}`);
      process.exit(1);
    }

    // Create the blocker record
    const blocker = createBlocker(db, {
      run_id: agent.run_id,
      agent_id: agentId,
      module_id: agent.module_id ?? undefined,
      type: options.type as BlockerType,
      description: options.description,
    });

    // Mark agent as blocked
    updateAgentStatus(db, agentId, "blocked");

    // Log event
    createEvent(db, agent.run_id, "agent-blocked", {
      blocker_id: blocker.id,
      type: options.type,
      description: options.description,
    }, agentId);

    log.success(`Blocker created: ${blocker.id}`);
    log.info(`Type: ${options.type}`);
    log.info(`Description: ${options.description}`);
    log.info(`Agent ${agentId} is now blocked.`);

    // Check if this is the only active agent — if so, pause the run
    const activeAgents = getActiveAgents(db, agent.run_id);
    if (activeAgents.length === 0) {
      pauseRun(db, agent.run_id, "blocked");
      log.warn(`No active agents remaining — run ${agent.run_id} paused.`);
    }

    log.info(`\nTo resolve: dark agent resolve ${blocker.id} --value "<the answer>"`);
  });
