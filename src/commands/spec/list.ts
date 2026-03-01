import { Command } from "commander";
import { join } from "node:path";
import { findDfDir } from "../../utils/config.js";
import { getDb } from "../../db/index.js";
import { listSpecs } from "../../db/queries/specs.js";
import { listRuns } from "../../db/queries/runs.js";
import { formatJson, formatStatus } from "../../utils/format.js";
import { log } from "../../utils/logger.js";

export const specListCommand = new Command("list")
  .description("List all specifications with build status")
  .option("--status <status>", "Filter by status")
  .option("--json", "Output as JSON")
  .action(async (options: { status?: string; json?: boolean }) => {
    const dfDir = findDfDir();
    if (!dfDir) {
      log.error("Not in a Dark Factory project. Run 'dark init' first.");
      process.exit(1);
    }

    const db = getDb(join(dfDir, "state.db"));
    const specs = listSpecs(db, options.status);

    // Enrich with latest run info
    const enriched = specs.map((spec) => {
      const runs = listRuns(db, spec.id);
      const latestRun = runs[0] ?? null;
      return {
        ...spec,
        latest_run: latestRun ? {
          id: latestRun.id,
          status: latestRun.status,
          phase: latestRun.current_phase,
          cost_usd: latestRun.cost_usd,
          budget_usd: latestRun.budget_usd,
        } : null,
        run_count: runs.length,
      };
    });

    if (options.json) {
      console.log(formatJson(enriched));
      return;
    }

    if (specs.length === 0) {
      console.log("No specs found. Create one with: dark spec create <title>");
      return;
    }

    console.log(`Specs (${specs.length}):\n`);
    for (const spec of enriched) {
      const run = spec.latest_run;
      let runInfo = "  no builds";
      if (run) {
        const costStr = `$${run.cost_usd.toFixed(2)}/$${run.budget_usd.toFixed(2)}`;
        runInfo = `  ${run.status} @ ${run.phase ?? "-"}  ${costStr}`;
      }
      console.log(`  ${spec.id}  ${formatStatus(spec.status)}  ${spec.title}`);
      console.log(`    └─${runInfo}${spec.run_count > 1 ? `  (${spec.run_count} runs)` : ""}`);
    }
  });
