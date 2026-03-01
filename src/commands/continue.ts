import { join } from "node:path";
import { Command } from "commander";
import { getDb } from "../db/index.js";
import { listAgents } from "../db/queries/agents.js";
import { getRun } from "../db/queries/runs.js";
import { PipelineEngine } from "../pipeline/engine.js";
import { getResumableRuns } from "../pipeline/resume.js";
import { ClaudeCodeRuntime } from "../runtime/claude-code.js";
import { findDfDir, getConfig } from "../utils/config.js";
import { log } from "../utils/logger.js";

export const continueCommand = new Command("continue")
  .description("Resume a failed pipeline run from the last completed phase")
  .argument("[run-id]", "Run ID to resume (auto-selects if only one failed run exists)")
  .option("--from-phase <phase>", "Override: resume from a specific phase")
  .option("--budget-usd <amount>", "Override budget cap in USD")
  .action(
    async (
      runIdArg: string | undefined,
      options: {
        fromPhase?: string;
        budgetUsd?: string;
      },
    ) => {
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
        const resumable = getResumableRuns(db);
        if (resumable.length === 0) {
          log.error("No resumable runs found. There are no failed or stale runs.");
          process.exit(1);
        }
        if (resumable.length === 1) {
          runId = resumable[0].id;
          log.info(
            `Auto-selected run: ${runId} (${resumable[0].status}, phase: ${resumable[0].current_phase})`,
          );
        } else {
          log.error("Multiple resumable runs found. Specify which one to resume:");
          for (const r of resumable) {
            const errorSuffix = r.error ? ` — ${r.error}` : "";
            console.log(
              `  ${r.id}  spec=${r.spec_id}  status=${r.status}  phase=${r.current_phase}${errorSuffix}`,
            );
          }
          process.exit(1);
        }
      } else {
        // Validate the run exists and is resumable
        const run = getRun(db, runId);
        if (!run) {
          log.error(`Run not found: ${runId}`);
          process.exit(1);
        }
        if (run.status !== "failed" && run.status !== "running") {
          log.error(
            `Run ${runId} is not resumable (status: ${run.status}). Only failed or stale running runs can be resumed.`,
          );
          process.exit(1);
        }
      }

      const runtime = new ClaudeCodeRuntime(config.runtime.agent_binary);
      const engine = new PipelineEngine(db, runtime, config);

      console.log(`[dark] Resuming pipeline run ${runId}...`);

      const resultRunId = await engine.resume({
        runId,
        fromPhase: options.fromPhase as import("../pipeline/phases.js").PhaseName | undefined,
        budgetUsd: options.budgetUsd ? Number.parseFloat(options.budgetUsd) : undefined,
      });

      // Post-resume summary
      const run = getRun(db, resultRunId);
      const agents = listAgents(db, resultRunId);
      const builders = agents.filter((a) => a.role === "builder");
      const completedBuilders = builders.filter((a) => a.status === "completed");
      const totalCost = agents.reduce((sum, a) => sum + a.cost_usd, 0);

      console.log(`\nPipeline run ${resultRunId} resumed.`);
      console.log(`  Status: ${run?.status ?? "unknown"}`);
      console.log(`  Modules built: ${completedBuilders.length}`);
      console.log(`  Total agents: ${agents.length}`);
      console.log(`  Cost: $${totalCost.toFixed(2)}`);
      console.log("Review output with: git diff");
    },
  );
