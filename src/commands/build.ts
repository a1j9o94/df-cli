import { Command } from "commander";
import { join } from "node:path";
import { findDfDir, getConfig } from "../utils/config.js";
import { getDb } from "../db/index.js";
import { PipelineEngine } from "../pipeline/engine.js";
import { ClaudeCodeRuntime } from "../runtime/claude-code.js";
import { log } from "../utils/logger.js";

export const buildCommand = new Command("build")
  .description("Run the full build pipeline for a spec")
  .argument("<spec-id>", "Specification ID to build")
  .option("--mode <mode>", "Build mode: quick or thorough")
  .option("--parallel <n>", "Maximum parallel builders")
  .option("--budget-usd <amount>", "Budget cap in USD")
  .option("--skip-architect", "Skip architect phase for single-module specs")
  .action(async (specId: string, options: {
    mode?: string;
    parallel?: string;
    budgetUsd?: string;
    skipArchitect?: boolean;
  }) => {
    const dfDir = findDfDir();
    if (!dfDir) {
      log.error("Not in a Dark Factory project. Run 'df init' first.");
      process.exit(1);
    }

    const config = getConfig(dfDir);

    if (options.parallel) {
      config.build.max_parallel = parseInt(options.parallel, 10);
    }

    const db = getDb(join(dfDir, "state.db"));
    const runtime = new ClaudeCodeRuntime(config.runtime.agent_binary);
    const engine = new PipelineEngine(db, runtime, config);

    const runId = await engine.execute(specId, {
      mode: options.mode,
      budget: options.budgetUsd ? parseFloat(options.budgetUsd) : undefined,
      skipArchitect: options.skipArchitect,
    });

    console.log(`Run ID: ${runId}`);
  });
