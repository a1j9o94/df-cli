import { Command } from "commander";
import { findDfDir } from "../utils/config.js";
import { getDb } from "../db/index.js";
import { listRuns } from "../db/queries/runs.js";
import { listAgents } from "../db/queries/agents.js";
import { formatJson, formatStatus } from "../utils/format.js";
import { log } from "../utils/logger.js";
import { join } from "node:path";

export const statusCommand = new Command("status")
  .description("Show current pipeline status")
  .option("--run-id <id>", "Show status for a specific run")
  .option("--json", "Output as JSON")
  .action(async (options: { runId?: string; json?: boolean }) => {
    const dfDir = findDfDir();
    if (!dfDir) {
      log.error("Not in a Dark Factory project. Run 'df init' first.");
      process.exit(1);
    }

    const db = getDb(join(dfDir, "state.db"));
    const runs = listRuns(db);

    if (runs.length === 0) {
      if (options.json) {
        console.log(formatJson({ runs: [], message: "No runs found" }));
      } else {
        console.log("No runs found. Start one with: df build <spec-id>");
      }
      return;
    }

    // If a specific run is requested, show details
    if (options.runId) {
      const run = runs.find((r) => r.id === options.runId);
      if (!run) {
        log.error(`Run ${options.runId} not found`);
        process.exit(1);
      }

      const agents = listAgents(db, run.id);

      if (options.json) {
        console.log(formatJson({ run, agents }));
        return;
      }

      console.log(`Run: ${run.id}`);
      console.log(`  Spec:      ${run.spec_id}`);
      console.log(`  Status:    ${formatStatus(run.status)}`);
      console.log(`  Phase:     ${run.current_phase ?? "(none)"}`);
      console.log(`  Mode:      ${run.mode}`);
      console.log(`  Iteration: ${run.iteration}/${run.max_iterations}`);
      console.log(`  Cost:      $${run.cost_usd.toFixed(2)} / $${run.budget_usd.toFixed(2)}`);
      console.log(`  Tokens:    ${run.tokens_used.toLocaleString()}`);
      if (run.error) console.log(`  Error:     ${run.error}`);

      if (agents.length > 0) {
        console.log(`\n  Agents (${agents.length}):`);
        for (const a of agents) {
          const phase = a.tdd_phase ? ` [${a.tdd_phase}]` : "";
          console.log(`    ${a.name} (${a.role}) — ${formatStatus(a.status)}${phase}`);
        }
      }
      return;
    }

    // Show summary of all runs
    if (options.json) {
      console.log(formatJson({ runs }));
      return;
    }

    console.log(`Runs (${runs.length}):\n`);
    for (const run of runs) {
      const agents = listAgents(db, run.id);
      const activeCount = agents.filter((a) => ["pending", "spawning", "running"].includes(a.status)).length;
      console.log(`  ${run.id}  ${formatStatus(run.status)}  spec=${run.spec_id}  phase=${run.current_phase ?? "-"}  agents=${activeCount}/${agents.length}  $${run.cost_usd.toFixed(2)}/$${run.budget_usd.toFixed(2)}`);
    }
  });
