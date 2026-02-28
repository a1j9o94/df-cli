import { Command } from "commander";
import { join } from "node:path";
import { findDfDir } from "../../utils/config.js";
import { getDb } from "../../db/index.js";
import { getContract, updateContractContent, getBindingsForContract } from "../../db/queries/contracts.js";
import { createEvent } from "../../db/queries/events.js";
import { createMessage } from "../../db/queries/messages.js";
import { log } from "../../utils/logger.js";

export const contractUpdateCommand = new Command("update")
  .description("Update a contract's content")
  .argument("<contract-id>", "Contract ID")
  .requiredOption("--content <content>", "New contract content")
  .requiredOption("--reason <reason>", "Reason for the update")
  .requiredOption("--agent <agent-id>", "Agent performing the update")
  .action(async (contractId: string, options: { content: string; reason: string; agent: string }) => {
    const dfDir = findDfDir();
    if (!dfDir) {
      log.error("Not in a Dark Factory project.");
      process.exit(1);
    }

    const db = getDb(join(dfDir, "state.db"));
    const contract = getContract(db, contractId);

    if (!contract) {
      log.error(`Contract not found: ${contractId}`);
      process.exit(1);
    }

    const oldVersion = contract.version;
    updateContractContent(db, contractId, options.content, options.reason);

    createEvent(db, contract.run_id, "contract-updated", {
      contractId,
      oldVersion,
      newVersion: oldVersion + 1,
      reason: options.reason,
    }, options.agent);

    // Notify all bound agents
    const bindings = getBindingsForContract(db, contractId);
    for (const binding of bindings) {
      if (binding.agent_id !== options.agent) {
        createMessage(
          db, contract.run_id, options.agent,
          `Contract "${contract.name}" updated to v${oldVersion + 1}. Reason: ${options.reason}`,
          { toAgentId: binding.agent_id },
        );
      }
    }

    log.success(`Contract updated: ${contractId} v${oldVersion} -> v${oldVersion + 1}`);
    log.info(`  Notified ${bindings.length - 1} bound agents`);
  });
