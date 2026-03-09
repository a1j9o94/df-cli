import { Command } from "commander";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, basename } from "node:path";
import { stringify as yamlStringify } from "yaml";
import { DEFAULT_CONFIG } from "../types/config.js";
import { getDb, closeDb } from "../db/index.js";
import { log } from "../utils/logger.js";
import { registerProject } from "../utils/registry.js";

const DEFAULT_PIPELINE = {
  name: "default-v2",
  version: 2,
  phases: [
    {
      id: "scout",
      agent: "orchestrator",
      description: "Initial codebase mapping and expertise loading.",
      gate: { type: "artifact", artifact: "context summary produced" },
    },
    {
      id: "architect",
      agent: "architect",
      description: "Technical decomposition. Produces buildplan with modules, contracts, dependency DAG, and integration strategy.",
      skip_when: "run.config.skip_architect == true",
      gate: { type: "artifact", artifact: "buildplan submitted and validated" },
      timeout_min: 10,
    },
    {
      id: "plan-review",
      agent: "orchestrator",
      description: "Orchestrator reviews buildplan. For complex builds (>4 modules), presents summary to human for approval.",
      gate: { type: "decision", auto_approve_when: "buildplan.modules.length <= 4" },
    },
    {
      id: "build",
      agent: "builder",
      description: "TDD cycle per module per builder. Builders spawn in dependency order per buildplan.",
      gate: {
        type: "compound",
        conditions: [
          "all builder tests passing",
          "all quality commands passing",
          "all assigned issues in done status",
          "all contracts acknowledged",
        ],
      },
    },
    {
      id: "integrate",
      agent: "integration-tester",
      description: "Compose parallel builder outputs. Verify modules work together.",
      skip_when: "buildplan.modules.length <= 1",
      gate: {
        type: "compound",
        conditions: [
          "all integration checkpoint tests passing",
          "no contract violations",
          "all quality commands passing on composed code",
        ],
      },
    },
    {
      id: "evaluate-functional",
      agent: "evaluator",
      description: "Run functional holdout scenarios against integrated code.",
      gate: { type: "threshold", metric: "satisfaction", threshold: "config.thresholds.satisfaction" },
    },
    {
      id: "evaluate-change",
      agent: "evaluator",
      description: "Run change holdout scenarios.",
      skip_when: "run.skip_change_eval == true",
      gate: { type: "threshold", metric: "changeability", threshold: "config.thresholds.changeability" },
    },
    {
      id: "merge",
      agent: "merger",
      description: "Integrate into target branch. Post-merge validation.",
      gate: {
        type: "compound",
        conditions: [
          "merge completed",
          "all tests passing post-merge",
          "all quality commands passing post-merge",
        ],
      },
    },
  ],
  iteration: {
    max_iterations: 3,
    iteration_trigger: "evaluate-functional.on_fail OR evaluate-change.on_fail OR integrate.on_fail",
    iteration_target: "build",
  },
};

export const initCommand = new Command("init")
  .description("Initialize a Dark Factory project in the current directory")
  .option("--name <name>", "Project name")
  .action(async (options: { name?: string }) => {
    const cwd = process.cwd();
    const dfDir = join(cwd, ".df");

    if (existsSync(dfDir)) {
      log.error(".df/ already exists in this directory");
      process.exit(1);
    }

    const projectName = options.name ?? basename(cwd);

    // Create directory structure
    const dirs = [
      dfDir,
      join(dfDir, "specs"),
      join(dfDir, "expertise"),
      join(dfDir, "scenarios"),
      join(dfDir, "worktrees"),
      join(dfDir, "buildplans"),
      join(dfDir, "contracts"),
      join(dfDir, "logs"),
    ];

    for (const dir of dirs) {
      mkdirSync(dir, { recursive: true });
    }

    // Write config.yaml
    const config = { ...DEFAULT_CONFIG, project: { ...DEFAULT_CONFIG.project, name: projectName } };
    writeFileSync(join(dfDir, "config.yaml"), yamlStringify(config));

    // Write pipeline.yaml
    writeFileSync(join(dfDir, "pipeline.yaml"), yamlStringify(DEFAULT_PIPELINE));

    // Initialize SQLite database
    const dbPath = join(dfDir, "state.db");
    getDb(dbPath);
    closeDb();

    // Register project in global registry
    registerProject({
      name: projectName,
      path: cwd,
      type: "project",
    });

    log.success(`Initialized Dark Factory project: ${projectName}`);
    log.info(`  ${dfDir}/config.yaml   — project configuration`);
    log.info(`  ${dfDir}/pipeline.yaml — pipeline phase definitions`);
    log.info(`  ${dfDir}/state.db      — state database`);
    log.info(`  ${dfDir}/specs/        — specification documents`);
    log.info(`  ${dfDir}/scenarios/    — holdout test scenarios`);
  });
