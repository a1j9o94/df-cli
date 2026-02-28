import { Command } from "commander";
import { join } from "node:path";
import { findDfDir } from "../../utils/config.js";
import { getDb } from "../../db/index.js";
import { getContract, getBindingsForAgent } from "../../db/queries/contracts.js";
import { getAgent } from "../../db/queries/agents.js";
import { formatJson } from "../../utils/format.js";
import { log } from "../../utils/logger.js";

export const contractCheckCommand = new Command("check")
  .description("Check contract compliance for a builder's output")
  .argument("<contract-id>", "Contract ID")
  .requiredOption("--agent <agent-id>", "Builder agent ID")
  .option("--json", "Output as JSON")
  .action(async (contractId: string, options: { agent: string; json?: boolean }) => {
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

    const agent = getAgent(db, options.agent);
    if (!agent) {
      log.error(`Agent not found: ${options.agent}`);
      process.exit(1);
    }

    const bindings = getBindingsForAgent(db, options.agent);
    const binding = bindings.find((b) => b.contract_id === contractId);

    if (!binding) {
      log.warn(`Agent ${options.agent} is not bound to contract ${contractId}`);
    }

    // Structural compliance check is deferred to Phase 7 (integration).
    // For now, report binding status.
    const result = {
      contractId,
      agentId: options.agent,
      bound: !!binding,
      role: binding?.role ?? null,
      acknowledged: binding?.acknowledged ?? false,
      contractVersion: contract.version,
      format: contract.format,
    };

    if (options.json) {
      console.log(formatJson(result));
      return;
    }

    console.log(`Contract compliance check:`);
    console.log(`  Contract:     ${contract.name} v${contract.version}`);
    console.log(`  Agent:        ${agent.name} (${agent.role})`);
    console.log(`  Bound:        ${result.bound ? "yes" : "no"}`);
    console.log(`  Role:         ${result.role ?? "-"}`);
    console.log(`  Acknowledged: ${result.acknowledged ? "yes" : "no"}`);
  });
