import { Command } from "commander";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { findDfDir } from "../../utils/config.js";
import { getDb } from "../../db/index.js";
import { getAgent } from "../../db/queries/agents.js";
import { createEvent } from "../../db/queries/events.js";
import { estimateAndRecordCost } from "../../pipeline/budget.js";
import { autoCommitFile } from "../../pipeline/auto-commit.js";
import { log } from "../../utils/logger.js";
import { gitCommitFile } from "../../utils/git-persistence.js";

export const scenarioCreateCommand = new Command("create")
  .description("Create a holdout test scenario (called by Architect agent)")
  .argument("<agent-id>", "Architect agent ID creating the scenario")
  .requiredOption("--name <name>", "Scenario name (used as filename)")
  .requiredOption("--type <type>", "Scenario type: functional or change")
  .requiredOption("--content <content>", "Scenario content (test description, steps, expected results)")
  .option("--spec-id <id>", "Spec ID this scenario belongs to")
  .action(async (agentId: string, options: { name: string; type: string; content: string; specId?: string }) => {
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

    // Estimate cost on every scenario create
    estimateAndRecordCost(db, agentId);

    if (agent.role !== "architect" && agent.role !== "evaluator") {
      log.error(`Only architects and evaluators can create scenarios (agent role: ${agent.role})`);
      process.exit(1);
    }

    if (options.type !== "functional" && options.type !== "change") {
      log.error(`Scenario type must be "functional" or "change", got: ${options.type}`);
      process.exit(1);
    }

    // Create scenario file
    const scenarioDir = join(dfDir, "scenarios", options.type);
    mkdirSync(scenarioDir, { recursive: true });

    const safeName = options.name.replace(/[^a-zA-Z0-9_-]/g, "_");
    const filePath = join(scenarioDir, `${safeName}.md`);

    const scenarioContent = [
      `---`,
      `name: ${options.name}`,
      `type: ${options.type}`,
      `spec_id: ${options.specId ?? agent.run_id}`,
      `created_by: ${agentId}`,
      `---`,
      ``,
      options.content,
    ].join("\n");

    writeFileSync(filePath, scenarioContent);

    createEvent(db, agent.run_id, "contract-created" as any, {
      scenario_name: options.name,
      scenario_type: options.type,
      scenario_path: filePath,
    }, agentId);

    // Auto-commit scenario file to git (belt-and-suspenders: scenarios in both DB and git)
    const projectRoot = dirname(dfDir);
    const gitRelativePath = join(".df", "scenarios", options.type, `${safeName}.md`);
    const commitResult = autoCommitFile(projectRoot, gitRelativePath, `Auto-commit: scenario ${options.name} created`);
    if (commitResult.success) {
      log.info("  Scenario committed to git history");
    }

    log.success(`Scenario created: ${filePath}`);
    log.info(`  Name: ${options.name}`);
    log.info(`  Type: ${options.type}`);
  });
