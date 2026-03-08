import { join } from "node:path";
import { Command } from "commander";
import { getDb } from "../db/index.js";
import { getRun, listRuns } from "../db/queries/runs.js";
import { pauseRun } from "../pipeline/pause.js";
import { ClaudeCodeRuntime } from "../runtime/claude-code.js";
import { findDfDir, getConfig } from "../utils/config.js";
import { log } from "../utils/logger.js";

export const pauseCommand = new Command("pause")
  .description("Pause a running build — agents suspended, state preserved, resume available")
  .argument("[run-id]", "Run ID to pause (auto-selects if only one running build)")
  .addHelpText("after", `
Examples:

  $ dark pause                       # pause the most recent active run
  $ dark pause run_01ABC123          # pause a specific run
  $ dark continue run_01ABC123       # resume a paused run
  $ dark continue run_01ABC123 --budget-usd 25  # resume with new budget

Paused runs preserve all worktrees and agent state. Resume any time
with "dark continue".
`)
  .action(
    async (runIdArg: string | undefined) => {
      const dfDir = findDfDir();
      if (!dfDir) {
        log.error("Not in a Dark Factory project. Run 'dark init' first.");
        process.exit(1);
      }

      const config = getConfig(dfDir);
      const db = getDb(join(dfDir, "state.db"));

      // Resolve run ID
      let runId = runIdArg;
      if (!runId) {
        // Find the most recent running run
        const allRuns = listRuns(db);
        const runningRuns = allRuns.filter((r) => r.status === "running");

        if (runningRuns.length === 0) {
          log.error("No running builds to pause.");
          process.exit(1);
        }
        if (runningRuns.length === 1) {
          runId = runningRuns[0].id;
          log.info(`Auto-selected run: ${runId}`);
        } else {
          log.error("Multiple running builds found. Specify which one to pause:");
          for (const r of runningRuns) {
            console.log(
              `  ${r.id}  spec=${r.spec_id}  phase=${r.current_phase}  cost=$${r.cost_usd.toFixed(2)}`,
            );
          }
          process.exit(1);
        }
      } else {
        // Validate the run exists
        const run = getRun(db, runId);
        if (!run) {
          log.error(`Run not found: ${runId}`);
          process.exit(1);
        }
        if (run.status !== "running") {
          log.error(
            `Run ${runId} is not running (status: ${run.status}). Only running builds can be paused.`,
          );
          process.exit(1);
        }
      }

      const runtime = new ClaudeCodeRuntime(config.runtime.agent_binary);
      const result = await pauseRun(db, runtime, runId!, "manual");

      if (!result.success) {
        log.error(`Failed to pause: ${result.error}`);
        process.exit(1);
      }

      // pauseRun already prints the console output
    },
  );
