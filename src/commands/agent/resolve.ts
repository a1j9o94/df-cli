import { Command } from "commander";
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { findDfDir } from "../../utils/config.js";
import { getDb } from "../../db/index.js";
import { getAgent, updateAgentStatus, getActiveAgents } from "../../db/queries/agents.js";
import { getBlocker, resolveBlocker } from "../../db/queries/blockers.js";
import { createMessage } from "../../db/queries/messages.js";
import { createEvent } from "../../db/queries/events.js";
import { encryptSecret } from "../../utils/secrets.js";
import { getEncryptionKey } from "../../utils/secrets.js";
import { log } from "../../utils/logger.js";

export const agentResolveCommand = new Command("resolve")
  .description("Resolve a blocker request — provide the missing resource and resume the agent")
  .argument("<request-id>", "Blocker request ID (blk_...)")
  .option("--value <text>", "The answer/resource value")
  .option("--file <path>", "Provide a file as the resolution")
  .option("--env <KEY=VALUE>", "Set an environment variable for the agent")
  .action(async (requestId: string, options: { value?: string; file?: string; env?: string }) => {
    const dfDir = findDfDir();
    if (!dfDir) {
      log.error("Not in a Dark Factory project.");
      process.exit(1);
    }

    const db = getDb(join(dfDir, "state.db"));
    const blocker = getBlocker(db, requestId);

    if (!blocker) {
      log.error(`Blocker not found: ${requestId}`);
      process.exit(1);
    }

    if (blocker.status === "resolved") {
      log.error(`Blocker ${requestId} is already resolved.`);
      process.exit(1);
    }

    // Determine the resolution value
    let resolvedValue: string;
    let mailBody: string;

    if (options.env) {
      // --env KEY=VALUE
      const eqIndex = options.env.indexOf("=");
      if (eqIndex === -1) {
        log.error("--env must be in KEY=VALUE format");
        process.exit(1);
      }
      const envKey = options.env.substring(0, eqIndex);
      const envValue = options.env.substring(eqIndex + 1);
      resolvedValue = options.env;
      mailBody = `Blocker resolved. Environment variable ${envKey} has been set.`;
    } else if (options.file) {
      // --file path
      try {
        resolvedValue = readFileSync(options.file, "utf-8");
        mailBody = `Blocker resolved. File contents provided from: ${options.file}`;
      } catch (err) {
        log.error(`Cannot read file: ${options.file}`);
        process.exit(1);
      }
    } else if (options.value) {
      resolvedValue = options.value;
      mailBody = `Blocker resolved: ${options.value}`;
    } else {
      log.error("Must provide one of: --value, --file, or --env");
      process.exit(1);
    }

    // For secret-type blockers, encrypt the stored value
    if (blocker.type === "secret") {
      const encKey = getEncryptionKey(dfDir);
      resolvedValue = encryptSecret(resolvedValue, encKey);
      // Don't include secret value in mail
      mailBody = "Blocker resolved. Secret has been provided (check environment variables).";
    }

    // Resolve the blocker
    resolveBlocker(db, requestId, resolvedValue, "user");

    // Send mail to the blocked agent (without secret values)
    createMessage(db, blocker.run_id, "system", mailBody, {
      toAgentId: blocker.agent_id,
    });

    // Resume the agent
    const agent = getAgent(db, blocker.agent_id);
    if (agent && agent.status === "blocked") {
      updateAgentStatus(db, blocker.agent_id, "running");
      log.success(`Agent ${blocker.agent_id} resumed.`);
    }

    // Log event
    createEvent(db, blocker.run_id, "blocker-resolved", {
      blocker_id: requestId,
      type: blocker.type,
    }, blocker.agent_id);

    log.success(`Blocker ${requestId} resolved.`);

    // Check if run should resume
    if (agent) {
      const run = db.prepare("SELECT * FROM runs WHERE id = ?").get(agent.run_id) as { status: string } | null;
      if (run && run.status === "paused") {
        db.prepare("UPDATE runs SET status = 'running', paused_at = NULL, pause_reason = NULL, updated_at = datetime('now') WHERE id = ?").run(agent.run_id);
        log.success(`Run ${agent.run_id} resumed.`);
      }
    }
  });
