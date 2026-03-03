import { Command } from "commander";
import { join } from "node:path";
import { findDfDir, getConfig } from "../utils/config.js";
import { getDb } from "../db/index.js";
import { getRun } from "../db/queries/runs.js";
import { getSpec, listSpecs, updateSpecHash } from "../db/queries/specs.js";
import { listAgents } from "../db/queries/agents.js";
import { PipelineEngine } from "../pipeline/engine.js";
import { ClaudeCodeRuntime } from "../runtime/claude-code.js";
import { log } from "../utils/logger.js";
import { preBuildValidation, computeContentHash } from "../pipeline/build-guards.js";

export const buildCommand = new Command("build")
  .description("Run the full build pipeline for a spec")
  .argument("[spec-id]", "Specification ID to build (auto-selects if only one exists)")
  .option("--mode <mode>", "Build mode: quick or thorough")
  .option("--parallel <n>", "Maximum parallel builders")
  .option("--budget-usd <amount>", "Budget cap in USD")
  .option("--skip-architect", "Skip architect decomposition (scenarios are still extracted from spec)")
  .option("--force", "Bypass content hash check (does not bypass status check)")
  .action(async (specIdArg: string | undefined, options: {
    mode?: string;
    parallel?: string;
    budgetUsd?: string;
    skipArchitect?: boolean;
    force?: boolean;
  }) => {
    const dfDir = findDfDir();
    if (!dfDir) {
      log.error("Not in a Dark Factory project. Run 'dark init' first.");
      process.exit(1);
    }

    const config = getConfig(dfDir);

    if (options.parallel) {
      config.build.max_parallel = parseInt(options.parallel, 10);
    }

    const db = getDb(join(dfDir, "state.db"));

    // Resolve spec ID
    let specId = specIdArg;
    if (!specId) {
      const specs = listSpecs(db);
      if (specs.length === 0) {
        log.error("No specs found. Create one first: dark spec create \"<description>\"");
        process.exit(1);
      }
      if (specs.length === 1) {
        specId = specs[0].id;
        log.info(`Auto-selected spec: ${specId} (${specs[0].title})`);
      } else {
        log.error("Multiple specs found. Specify which one to build:");
        for (const s of specs) {
          log.info(`  ${s.id}  ${s.title}  [${s.status}]`);
        }
        process.exit(1);
      }
    } else {
      // Validate the spec exists, show helpful error if not
      const spec = getSpec(db, specId);
      if (!spec) {
        const specs = listSpecs(db);
        log.error(`Spec not found: ${specId}`);
        if (specs.length > 0) {
          log.error("Available specs:");
          for (const s of specs) {
            log.info(`  ${s.id}  ${s.title}  [${s.status}]`);
          }
        } else {
          log.error("No specs exist. Create one first: dark spec create \"<description>\"");
        }
        process.exit(1);
      }
    }

    // Pre-build validation: status check and content hash check
    const spec = getSpec(db, specId)!;
    const validation = preBuildValidation(db, specId, spec.file_path, options.force ?? false);

    if (!validation.allowed) {
      if (validation.error) {
        log.error(validation.error);
        process.exit(1);
      }
      if (validation.warning) {
        log.warn(validation.warning);
        process.exit(1);
      }
    }

    // Store content hash before build starts
    try {
      const hash = computeContentHash(spec.file_path);
      updateSpecHash(db, specId, hash);
    } catch {
      // If file can't be read for hashing, continue anyway
    }

    const logsDir = join(dfDir, "logs");
    const runtime = new ClaudeCodeRuntime(config.runtime.agent_binary);
    const engine = new PipelineEngine(db, runtime, config);

    const runId = await engine.execute(specId, {
      mode: options.mode,
      budget: options.budgetUsd ? parseFloat(options.budgetUsd) : undefined,
      skipArchitect: options.skipArchitect,
      force: options.force,
    });

    // Post-pipeline summary
    const run = getRun(db, runId);
    const agents = listAgents(db, runId);
    const builders = agents.filter((a) => a.role === "builder");
    const completedBuilders = builders.filter((a) => a.status === "completed");
    const totalCost = agents.reduce((sum, a) => sum + a.cost_usd, 0);

    console.log(`\nPipeline run ${runId} complete.`);
    console.log(`  Status: ${run?.status ?? "unknown"}`);
    console.log(`  Modules built: ${completedBuilders.length}`);
    console.log(`  Total agents: ${agents.length}`);
    console.log(`  Cost: $${totalCost.toFixed(2)}`);
    console.log(`Do NOT duplicate this work. Review output with: git diff`);
  });
