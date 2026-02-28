import { Command } from "commander";
import { join } from "node:path";
import { findDfDir } from "../../utils/config.js";
import { getDb } from "../../db/index.js";
import { getContract, getBindingsForContract } from "../../db/queries/contracts.js";
import { formatJson } from "../../utils/format.js";
import { log } from "../../utils/logger.js";

export const contractShowCommand = new Command("show")
  .description("Show contract details")
  .argument("<contract-id>", "Contract ID")
  .option("--json", "Output as JSON")
  .action(async (contractId: string, options: { json?: boolean }) => {
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

    const bindings = getBindingsForContract(db, contractId);

    if (options.json) {
      console.log(formatJson({ ...contract, bindings }));
      return;
    }

    console.log(`Contract: ${contract.id}`);
    console.log(`  Name:     ${contract.name}`);
    console.log(`  Format:   ${contract.format}`);
    console.log(`  Version:  ${contract.version}`);
    console.log(`  Desc:     ${contract.description}`);

    if (bindings.length > 0) {
      console.log(`\n  Bindings (${bindings.length}):`);
      for (const b of bindings) {
        const ack = b.acknowledged ? "ack" : "pending";
        console.log(`    ${b.agent_id} (${b.role}, module=${b.module_id}) [${ack}]`);
      }
    }

    console.log(`\n--- Content ---\n`);
    console.log(contract.content);
  });
