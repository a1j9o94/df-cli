import { Command } from "commander";
import { join } from "node:path";
import { findDfDir } from "../../utils/config.js";
import { getDb } from "../../db/index.js";
import { getMessagesForAgent, getMessagesForRole, markAllReadForAgent } from "../../db/queries/messages.js";
import { getAgent } from "../../db/queries/agents.js";
import { estimateAndRecordCost } from "../../pipeline/budget.js";
import { formatJson } from "../../utils/format.js";
import { log } from "../../utils/logger.js";

export const mailCheckCommand = new Command("check")
  .description("Check messages for an agent")
  .requiredOption("--agent <agent-id>", "Agent ID to check messages for")
  .option("--unread", "Show only unread messages")
  .option("--mark-read", "Mark all messages as read after checking")
  .option("--json", "Output as JSON")
  .action(async (options: { agent: string; unread?: boolean; markRead?: boolean; json?: boolean }) => {
    const dfDir = findDfDir();
    if (!dfDir) {
      log.error("Not in a Dark Factory project.");
      process.exit(1);
    }

    const db = getDb(join(dfDir, "state.db"));
    const agent = getAgent(db, options.agent);

    if (!agent) {
      log.error(`Agent not found: ${options.agent}`);
      process.exit(1);
    }

    // Estimate cost on every mail check
    estimateAndRecordCost(db, options.agent);

    // Get direct messages + role-based messages
    const directMsgs = getMessagesForAgent(db, options.agent, options.unread);
    const roleMsgs = getMessagesForRole(db, agent.run_id, agent.role, options.unread);

    // Combine and deduplicate
    const seen = new Set<string>();
    const allMessages = [];
    for (const msg of [...directMsgs, ...roleMsgs]) {
      if (!seen.has(msg.id)) {
        seen.add(msg.id);
        allMessages.push(msg);
      }
    }

    // Sort by created_at
    allMessages.sort((a, b) => a.created_at.localeCompare(b.created_at));

    if (options.json) {
      console.log(formatJson(allMessages));
    } else if (allMessages.length === 0) {
      console.log("No messages.");
    } else {
      for (const msg of allMessages) {
        const readFlag = msg.read ? "" : " [NEW]";
        console.log(`${msg.created_at}  from=${msg.from_agent_id}${readFlag}`);
        console.log(`  ${msg.body}\n`);
      }
    }

    if (options.markRead) {
      markAllReadForAgent(db, options.agent);
    }
  });
