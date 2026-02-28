import { Command } from "commander";
import { join } from "node:path";
import { findDfDir } from "../../utils/config.js";
import { getDb } from "../../db/index.js";
import { getContract, acknowledgeContract } from "../../db/queries/contracts.js";
import { createEvent } from "../../db/queries/events.js";
import { log } from "../../utils/logger.js";

export const contractAcknowledgeCommand = new Command("acknowledge")
  .description("Acknowledge a contract (called by Builder)")
  .argument("<contract-id>", "Contract ID")
  .requiredOption("--agent <agent-id>", "Builder agent ID")
  .action(async (contractId: string, options: { agent: string }) => {
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

    acknowledgeContract(db, contractId, options.agent);
    createEvent(db, contract.run_id, "contract-acknowledged", { contractId }, options.agent);

    log.success(`Contract ${contractId} acknowledged by ${options.agent}`);
  });
