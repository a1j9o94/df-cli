import { Command } from "commander";
import { join } from "node:path";
import { findDfDir } from "../../utils/config.js";
import { getDb } from "../../db/index.js";
import { createMessage } from "../../db/queries/messages.js";
import { getAgent, listAgents } from "../../db/queries/agents.js";
import { getBindingsForContract } from "../../db/queries/contracts.js";
import { estimateAndRecordCost } from "../../pipeline/budget.js";
import { log } from "../../utils/logger.js";

export const mailSendCommand = new Command("send")
  .description("Send a message to an agent, role, or contract group")
  .requiredOption("--to <target>", "Recipient: agent-id, @role, or @contract:<id>")
  .requiredOption("--body <message>", "Message body")
  .requiredOption("--from <agent-id>", "Sender agent ID")
  .requiredOption("--run-id <id>", "Run ID")
  .action(async (options: { to: string; body: string; from: string; runId: string }) => {
    const dfDir = findDfDir();
    if (!dfDir) {
      log.error("Not in a Dark Factory project.");
      process.exit(1);
    }

    const db = getDb(join(dfDir, "state.db"));
    const { to, body, from, runId } = options;

    // Estimate cost on every mail send
    estimateAndRecordCost(db, from);

    if (to.startsWith("@contract:")) {
      // Send to all agents bound to a contract
      const contractId = to.slice(10);
      const bindings = getBindingsForContract(db, contractId);

      if (bindings.length === 0) {
        log.warn(`No agents bound to contract ${contractId}`);
        return;
      }

      for (const binding of bindings) {
        if (binding.agent_id !== from) {
          createMessage(db, runId, from, body, { toAgentId: binding.agent_id });
        }
      }
      log.success(`Sent message to ${bindings.length - 1} agents bound to contract ${contractId}`);
    } else if (to.startsWith("@")) {
      // Send to a role
      const role = to.slice(1);
      createMessage(db, runId, from, body, { toRole: role });
      log.success(`Sent message to role @${role}`);
    } else {
      // Send to a specific agent
      const target = getAgent(db, to);
      if (!target) {
        log.error(`Agent not found: ${to}`);
        process.exit(1);
      }
      createMessage(db, runId, from, body, { toAgentId: to });
      log.success(`Sent message to ${to}`);
    }
  });
