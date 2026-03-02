import { Command } from "commander";
import { findDfDir } from "../utils/config.js";
import { getDb } from "../db/index.js";
import { listRuns } from "../db/queries/runs.js";
import { listAgents } from "../db/queries/agents.js";
import { formatJson, formatStatus } from "../utils/format.js";
import { log } from "../utils/logger.js";
import { join } from "node:path";
import { getRunQueueInfo, formatQueueStatus } from "../pipeline/queue-visibility.js";
import { detectDbCorruption } from "../utils/db-health.js";
import { restoreStateDb } from "../utils/state-backup.js";

export const statusCommand = new Command("status")
  .description("Show current pipeline status")
  .option("--run-id <id>", "Show status for a specific run")
  .option("--json", "Output as JSON")
  .option("--restore", "Restore state DB from backup if corrupt")
  .action(async (options: { runId?: string; json?: boolean; restore?: boolean }) => {
    const dfDir = findDfDir();
    if (!dfDir) {
      log.error("Not in a Dark Factory project. Run 'df init' first.");
      process.exit(1);
    }

    // Guard 4 (partial): Check DB health before opening
    const health = detectDbCorruption(dfDir);
    if (health.isCorrupt) {
      log.error(`State DB is corrupt or missing: ${health.error}`);

      if (health.hasBackup) {
        if (options.restore) {
          const restored = restoreStateDb(dfDir);
          if (restored) {
            log.success("State DB restored from backup.");
            log.info("Re-run 'dark status' to see pipeline status.");
          } else {
            log.error("Failed to restore from backup.");
          }
        } else {
          log.info("A backup is available. Run 'dark status --restore' to restore from backup.");
        }
      } else {
        log.warn("No backup available. The state DB may need to be recreated with 'dark init'.");
      }

      if (options.json) {
        console.log(formatJson({
          error: "State DB corrupt",
          details: health.error,
          hasBackup: health.hasBackup,
          restored: options.restore ?? false,
        }));
      }
      return;
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
      const queueInfo = getRunQueueInfo(db, run.id);

      if (options.json) {
        console.log(formatJson({ run, agents, mergeQueue: queueInfo }));
        return;
      }

      console.log(`Run: ${run.id}`);
      console.log(`  Spec:      ${run.spec_id}`);
      console.log(`  Status:    ${formatStatus(run.status)}`);
      const queueStr = formatQueueStatus(queueInfo);
      const phaseDisplay = run.current_phase ?? "(none)";
      console.log(`  Phase:     ${phaseDisplay}${queueStr ? ` ${queueStr}` : ""}`);
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
      const queueInfo = getRunQueueInfo(db, run.id);
      const queueStr = formatQueueStatus(queueInfo);
      const phaseDisplay = run.current_phase ?? "-";
      console.log(`  ${run.id}  ${formatStatus(run.status)}  spec=${run.spec_id}  phase=${phaseDisplay}${queueStr ? ` ${queueStr}` : ""}  agents=${activeCount}/${agents.length}  $${run.cost_usd.toFixed(2)}/$${run.budget_usd.toFixed(2)}`);
    }
  });
