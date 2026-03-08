import { Command } from "commander";
import { findDfDir } from "../utils/config.js";
import { getDb } from "../db/index.js";
import { listRuns } from "../db/queries/runs.js";
import { listAgents } from "../db/queries/agents.js";
import { getRunWithSpecTitle, getModuleProgress } from "../db/queries/status-queries.js";
import { formatJson, formatStatus } from "../utils/format.js";
import { formatModuleProgressInline } from "../utils/format-module-progress.js";
import { summarizeAgentCounts } from "../utils/agent-enrichment.js";
import { formatElapsed } from "../utils/time-format.js";
import { log } from "../utils/logger.js";
import { join } from "node:path";
import { getRunQueueInfo, formatQueueStatus } from "../pipeline/queue-visibility.js";
import { checkDbHealth } from "../pipeline/db-health.js";
import { listEvents } from "../db/queries/events.js";
import type { EventRecord } from "../types/event.js";

/** Fields excluded from --json output by default (large, rarely useful in status views) */
const STATUS_EXCLUDED_FIELDS = ["system_prompt"];

export const statusCommand = new Command("status")
  .description("Show current pipeline status")
  .option("--run-id <id>", "Show status for a specific run")
  .option("--detail [run-id]", "Show expanded detail view for a run")
  .option("--json", "Output as JSON")
  .option("--verbose", "Include all fields in JSON output")
  .option("--restore", "Restore state DB from backup if corrupt")
  .action(async (options: {
    runId?: string;
    detail?: string | boolean;
    json?: boolean;
    verbose?: boolean;
    restore?: boolean;
  }) => {
    const dfDir = findDfDir();
    if (!dfDir) {
      log.error("Not in a Dark Factory project. Run 'df init' first.");
      process.exit(1);
    }

    // Check DB health before attempting to read
    const healthCheck = checkDbHealth(dfDir);
    if (healthCheck.corrupt) {
      if (options.json) {
        console.log(formatJson({
          error: "state_db_corrupt",
          backupAvailable: healthCheck.backupAvailable,
          message: healthCheck.message,
        }));
      } else {
        log.error(healthCheck.message);
      }
      process.exit(1);
    }

    const db = getDb(join(dfDir, "state.db"));
    const runs = listRuns(db);
    const excludeFields = options.verbose ? [] : STATUS_EXCLUDED_FIELDS;

    if (runs.length === 0) {
      if (options.json) {
        console.log(formatJson({ runs: [], message: "No runs found" }));
      } else {
        console.log("No runs found. Start one with: df build <spec-id>");
      }
      return;
    }

    // Handle --detail flag
    if (options.detail !== undefined) {
      const detailRunId = typeof options.detail === "string" ? options.detail : options.runId;
      if (!detailRunId) {
        log.error("Please specify a run ID: dark status --detail <run-id>");
        process.exit(1);
      }
      showDetailView(db, detailRunId, options.json ?? false, excludeFields);
      return;
    }

    // If a specific run is requested, show enriched details
    if (options.runId) {
      const enrichedRun = getRunWithSpecTitle(db, options.runId);
      if (!enrichedRun) {
        log.error(`Run ${options.runId} not found`);
        process.exit(1);
      }

      const agents = listAgents(db, enrichedRun.id);
      const queueInfo = getRunQueueInfo(db, enrichedRun.id);
      const moduleProgress = getModuleProgress(db, enrichedRun.id);
      const agentCounts = summarizeAgentCounts(agents);

      if (options.json) {
        console.log(formatJson({ run: enrichedRun, agents, mergeQueue: queueInfo, moduleProgress }, { excludeFields }));
        return;
      }

      console.log(`Run: ${enrichedRun.id}`);

      // Spec with title
      const specDisplay = enrichedRun.spec_title
        ? `${enrichedRun.spec_id} (${enrichedRun.spec_title})`
        : enrichedRun.spec_id;
      console.log(`  Spec:      ${specDisplay}`);

      console.log(`  Status:    ${formatStatus(enrichedRun.status)}`);
      const queueStr = formatQueueStatus(queueInfo);
      const phaseDisplay = enrichedRun.current_phase ?? "(none)";
      console.log(`  Phase:     ${phaseDisplay}${queueStr ? ` ${queueStr}` : ""}`);
      console.log(`  Iteration: ${enrichedRun.iteration}/${enrichedRun.max_iterations}`);
      console.log(`  Cost:      $${enrichedRun.cost_usd.toFixed(2)} / $${enrichedRun.budget_usd.toFixed(2)}`);
      console.log(`  Tokens:    ${enrichedRun.tokens_used.toLocaleString()}`);
      if (enrichedRun.error) console.log(`  Error:     ${enrichedRun.error}`);

      // Agent breakdown
      console.log(`  Agents:    ${agentCounts.summary}`);

      // Module progress
      if (moduleProgress.length > 0) {
        console.log(`  Modules:   ${formatModuleProgressInline(moduleProgress)}`);
      }

      return;
    }

    // Show summary of all runs
    if (options.json) {
      console.log(formatJson({ runs }, { excludeFields }));
      return;
    }

    console.log(`Runs (${runs.length}):\n`);
    for (const run of runs) {
      const enriched = getRunWithSpecTitle(db, run.id);
      const agents = listAgents(db, run.id);
      const agentCounts = summarizeAgentCounts(agents);
      const queueInfo = getRunQueueInfo(db, run.id);
      const queueStr = formatQueueStatus(queueInfo);
      const phaseDisplay = run.current_phase ?? "-";
      const specTitle = enriched?.spec_title ? ` (${enriched.spec_title})` : "";
      console.log(`  ${run.id}  ${formatStatus(run.status)}  spec=${run.spec_id}${specTitle}  phase=${phaseDisplay}${queueStr ? ` ${queueStr}` : ""}  agents=${agentCounts.summary}  $${run.cost_usd.toFixed(2)}/$${run.budget_usd.toFixed(2)}`);
    }
  });

/**
 * Show expanded detail view for a single run.
 * Includes phase timeline, module grid, scenario results, and cost breakdown.
 */
function showDetailView(
  db: ReturnType<typeof getDb>,
  runId: string,
  jsonOutput: boolean,
  excludeFields: string[],
): void {
  const enrichedRun = getRunWithSpecTitle(db, runId);
  if (!enrichedRun) {
    log.error(`Run ${runId} not found`);
    process.exit(1);
  }

  const agents = listAgents(db, enrichedRun.id);
  const moduleProgress = getModuleProgress(db, enrichedRun.id);
  const agentCounts = summarizeAgentCounts(agents);
  const events = listEvents(db, enrichedRun.id);

  // Phase timeline from events
  const phaseTimeline = buildPhaseTimeline(events);

  // Cost breakdown by role
  const costByRole = buildCostByRole(agents);

  if (jsonOutput) {
    console.log(formatJson({
      run: enrichedRun,
      agents,
      moduleProgress,
      phaseTimeline,
      costByRole,
    }, { excludeFields }));
    return;
  }

  // Header
  const specDisplay = enrichedRun.spec_title
    ? `${enrichedRun.spec_id} (${enrichedRun.spec_title})`
    : enrichedRun.spec_id;
  console.log(`Run: ${enrichedRun.id}`);
  console.log(`  Spec:      ${specDisplay}`);
  console.log(`  Status:    ${formatStatus(enrichedRun.status)}`);
  console.log(`  Iteration: ${enrichedRun.iteration}/${enrichedRun.max_iterations}`);
  console.log(`  Cost:      $${enrichedRun.cost_usd.toFixed(2)} / $${enrichedRun.budget_usd.toFixed(2)}`);
  console.log(`  Agents:    ${agentCounts.summary}`);

  // Phase timeline
  console.log("\n  Phase Timeline:");
  if (phaseTimeline.length > 0) {
    for (const phase of phaseTimeline) {
      const elapsed = phase.durationMs > 0 ? formatElapsed(phase.durationMs) : "";
      const active = phase.active ? " (active)" : "";
      console.log(`    ${phase.name}: ${elapsed}${active}`);
    }
  } else {
    console.log("    No phase data");
  }

  // Module grid
  if (moduleProgress.length > 0) {
    console.log("\n  Modules:");
    console.log("    Module              Status      Builder                  Elapsed     Cost");
    console.log("    ------              ------      -------                  -------     ----");
    for (const mod of moduleProgress) {
      const name = mod.moduleId.padEnd(20);
      const status = mod.status.padEnd(12);
      const builder = (mod.agentName ?? "-").padEnd(25);
      const elapsed = mod.elapsedMs > 0 ? formatElapsed(mod.elapsedMs).padEnd(12) : "-".padEnd(12);
      const cost = mod.costUsd > 0 ? `$${mod.costUsd.toFixed(2)}` : "-";
      console.log(`    ${name}${status}${builder}${elapsed}${cost}`);
    }
  }

  // Cost breakdown by role
  if (Object.keys(costByRole).length > 0) {
    console.log("\n  Cost by Role:");
    for (const [role, cost] of Object.entries(costByRole)) {
      console.log(`    ${role}: $${cost.toFixed(2)}`);
    }
  }
}

interface PhaseTimelineEntry {
  name: string;
  durationMs: number;
  active: boolean;
}

function buildPhaseTimeline(events: EventRecord[]): PhaseTimelineEntry[] {
  const phases: PhaseTimelineEntry[] = [];
  const phaseStarts = new Map<string, string>();

  // Process events chronologically (events are DESC from DB, so reverse)
  for (const event of [...events].reverse()) {
    if (event.type === "phase-started" && event.data) {
      try {
        const data = JSON.parse(event.data);
        const phaseName = data.phase ?? data.name ?? "unknown";
        phaseStarts.set(phaseName, event.created_at);
      } catch { /* ignore parse errors */ }
    }
    if (event.type === "phase-completed" && event.data) {
      try {
        const data = JSON.parse(event.data);
        const phaseName = data.phase ?? data.name ?? "unknown";
        const startTime = phaseStarts.get(phaseName);
        if (startTime) {
          const durationMs = new Date(event.created_at).getTime() - new Date(startTime).getTime();
          phases.push({ name: phaseName, durationMs, active: false });
          phaseStarts.delete(phaseName);
        }
      } catch { /* ignore parse errors */ }
    }
  }

  // Any remaining started phases are still active
  for (const [phaseName, startTime] of phaseStarts) {
    const durationMs = Date.now() - new Date(startTime).getTime();
    phases.push({ name: phaseName, durationMs, active: true });
  }

  return phases;
}

function buildCostByRole(agents: Array<{ role: string; cost_usd: number }>): Record<string, number> {
  const costByRole: Record<string, number> = {};
  for (const agent of agents) {
    const role = agent.role === "builder" ? "builders" : agent.role;
    costByRole[role] = (costByRole[role] ?? 0) + agent.cost_usd;
  }
  return costByRole;
}
