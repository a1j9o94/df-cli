import { Command } from "commander";
import { join } from "node:path";
import { findDfDir } from "../../utils/config.js";
import { getDb } from "../../db/index.js";
import { getActiveBuildplan, listBuildplans } from "../../db/queries/buildplans.js";
import { formatJson, formatStatus } from "../../utils/format.js";
import { log } from "../../utils/logger.js";

export const architectGetPlanCommand = new Command("get-plan")
  .description("Retrieve the active buildplan for a spec")
  .argument("<spec-id>", "Specification ID")
  .option("--run-id <id>", "Specific run ID")
  .option("--json", "Output as JSON")
  .action(async (specId: string, options: { runId?: string; json?: boolean }) => {
    const dfDir = findDfDir();
    if (!dfDir) {
      log.error("Not in a Dark Factory project.");
      process.exit(1);
    }

    const db = getDb(join(dfDir, "state.db"));

    const bp = options.runId
      ? listBuildplans(db, options.runId).find((p) => p.status === "active")
      : getActiveBuildplan(db, specId);

    if (!bp) {
      log.error(`No active buildplan found for spec: ${specId}`);
      process.exit(1);
    }

    if (options.json) {
      console.log(formatJson({
        id: bp.id,
        status: bp.status,
        version: bp.version,
        module_count: bp.module_count,
        contract_count: bp.contract_count,
        estimated_cost_usd: bp.estimated_cost_usd,
        estimated_duration_min: bp.estimated_duration_min,
        plan: JSON.parse(bp.plan),
      }));
      return;
    }

    console.log(`Buildplan: ${bp.id}`);
    console.log(`  Status:     ${formatStatus(bp.status)}`);
    console.log(`  Version:    ${bp.version}`);
    console.log(`  Modules:    ${bp.module_count}`);
    console.log(`  Contracts:  ${bp.contract_count}`);
    console.log(`  Parallel:   ${bp.max_parallel}`);
    console.log(`  Est. cost:  $${bp.estimated_cost_usd?.toFixed(2) ?? "unknown"}`);
    console.log(`  Est. time:  ${bp.estimated_duration_min ?? "unknown"} min`);

    if (bp.reviewed_by) {
      console.log(`  Reviewed:   ${bp.reviewed_by}`);
      if (bp.review_notes) console.log(`  Notes:      ${bp.review_notes}`);
    }

    const plan = JSON.parse(bp.plan);
    if (plan.modules?.length > 0) {
      console.log(`\n  Modules:`);
      for (const mod of plan.modules) {
        console.log(`    ${mod.id}: ${mod.title} (${mod.estimated_complexity}, ~${mod.estimated_duration_min}min)`);
      }
    }

    if (plan.parallelism?.critical_path?.length > 0) {
      console.log(`\n  Critical path: ${plan.parallelism.critical_path.join(" -> ")}`);
    }
  });
