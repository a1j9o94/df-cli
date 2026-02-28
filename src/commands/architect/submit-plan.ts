import { Command } from "commander";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { findDfDir } from "../../utils/config.js";
import { getDb } from "../../db/index.js";
import { getAgent } from "../../db/queries/agents.js";
import { createBuildplan, updateBuildplanStatus } from "../../db/queries/buildplans.js";
import { createContract, createBinding } from "../../db/queries/contracts.js";
import { createEvent } from "../../db/queries/events.js";
import { validateBuildplan } from "../../pipeline/validation.js";
import { formatJson } from "../../utils/format.js";
import { log } from "../../utils/logger.js";

export const architectSubmitPlanCommand = new Command("submit-plan")
  .description("Submit a buildplan (called by Architect agent)")
  .argument("<agent-id>", "Architect agent ID")
  .requiredOption("--plan <json>", "Buildplan JSON or path to JSON file")
  .action(async (agentId: string, options: { plan: string }) => {
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
    if (agent.role !== "architect") {
      log.error(`Agent ${agentId} is not an architect (role: ${agent.role})`);
      process.exit(1);
    }

    // Read plan JSON — could be inline or a file path
    let planJson = options.plan;
    if (existsSync(planJson)) {
      planJson = readFileSync(planJson, "utf-8");
    }

    // Validate
    const validation = validateBuildplan(planJson);
    if (!validation.valid) {
      log.error("Buildplan validation failed:");
      for (const err of validation.errors) {
        log.error(`  - ${err}`);
      }
      process.exit(1);
    }

    if (validation.warnings.length > 0) {
      for (const warn of validation.warnings) {
        log.warn(`  - ${warn}`);
      }
    }

    // Create buildplan record
    const bp = createBuildplan(db, agent.run_id, agent.run_id, agentId, planJson);

    // Extract and create contracts + bindings
    const plan = JSON.parse(planJson);
    for (const contractDef of plan.contracts ?? []) {
      const contract = createContract(
        db, agent.run_id, bp.id,
        contractDef.name,
        contractDef.description ?? "",
        contractDef.format ?? "typescript",
        contractDef.content,
      );

      // Create bindings for each bound module
      if (contractDef.bound_modules && contractDef.binding_roles) {
        for (const moduleId of contractDef.bound_modules) {
          const role = contractDef.binding_roles[moduleId] ?? "consumer";
          // We don't have agent IDs for builders yet — bindings will be created
          // when builders are spawned. Store module-level bindings for now.
        }
      }
    }

    // Activate the buildplan
    updateBuildplanStatus(db, bp.id, "active");

    createEvent(db, agent.run_id, "buildplan-submitted", {
      planId: bp.id,
      moduleCount: bp.module_count,
      contractCount: bp.contract_count,
    }, agentId);

    log.success(`Buildplan submitted: ${bp.id}`);
    log.info(`  Modules:   ${bp.module_count}`);
    log.info(`  Contracts: ${bp.contract_count}`);
    log.info(`  Est. cost: $${bp.estimated_cost_usd?.toFixed(2) ?? "unknown"}`);
    log.info(`  Est. time: ${bp.estimated_duration_min ?? "unknown"} min`);
  });
