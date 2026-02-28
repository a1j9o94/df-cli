import { Command } from "commander";
import { join } from "node:path";
import { findDfDir, getConfig } from "../../utils/config.js";
import { getDb } from "../../db/index.js";
import { getRun } from "../../db/queries/runs.js";
import { runIntegration } from "../../pipeline/integration.js";
import { ClaudeCodeRuntime } from "../../runtime/claude-code.js";
import { formatJson } from "../../utils/format.js";
import { log } from "../../utils/logger.js";

export const integrateRunCommand = new Command("run")
  .description("Run integration tests for a build")
  .argument("<run-id>", "Run ID")
  .option("--phase <n>", "Specific phase to test")
  .option("--json", "Output as JSON")
  .action(async (runId: string, options: { phase?: string; json?: boolean }) => {
    const dfDir = findDfDir();
    if (!dfDir) {
      log.error("Not in a Dark Factory project.");
      process.exit(1);
    }

    const db = getDb(join(dfDir, "state.db"));
    const config = getConfig(dfDir);

    const run = getRun(db, runId);
    if (!run) {
      log.error(`Run not found: ${runId}`);
      process.exit(1);
    }

    const runtime = new ClaudeCodeRuntime(config.runtime.agent_binary);
    const phase = options.phase ? parseInt(options.phase, 10) : undefined;

    const result = await runIntegration(db, runtime, runId, phase);

    if (options.json) {
      console.log(formatJson(result));
      return;
    }

    console.log(`Integration: ${result.passed ? "PASSED" : "FAILED"}`);
    for (const cp of result.checkpointResults) {
      const icon = cp.passed ? "+" : "x";
      console.log(`  [${icon}] ${cp.checkpoint}`);
      if (cp.error) console.log(`      Error: ${cp.error}`);
    }
    if (result.finalResult) {
      const icon = result.finalResult.passed ? "+" : "x";
      console.log(`  [${icon}] Final: ${result.finalResult.checkpoint}`);
    }
  });
