import type { SqliteDb } from "../db/index.js";
import type { RunWithSpecTitle } from "../db/queries/status-queries.js";
import type { AgentRecord } from "../types/agent.js";
import { getModuleProgress } from "../db/queries/status-queries.js";
import { formatModuleProgressInline } from "./format-module-progress.js";
import { summarizeAgentCounts } from "./agent-enrichment.js";
import { formatStatus } from "./format.js";
import { getRunQueueInfo, formatQueueStatus } from "../pipeline/queue-visibility.js";

export interface FormatStatusDetailOptions {
  /** Show expanded detail view (phase timeline, module grid, cost breakdown) */
  detail?: boolean;
}

/**
 * Format a single run's status with enriched information:
 * - Spec title in parentheses after spec ID
 * - Module progress inline
 * - Agent count broken down into active/completed/dead
 * - Cost breakdown by role (in --detail mode)
 */
export function formatStatusDetail(
  db: SqliteDb,
  run: RunWithSpecTitle,
  options: FormatStatusDetailOptions = {},
): string {
  const lines: string[] = [];
  const agents = db.prepare("SELECT * FROM agents WHERE run_id = ? ORDER BY created_at DESC").all(run.id) as AgentRecord[];

  // Spec line: show title in parentheses if available
  const specDisplay = run.spec_title
    ? `${run.spec_id} (${run.spec_title})`
    : run.spec_id;

  const queueInfo = getRunQueueInfo(db, run.id);
  const queueStr = formatQueueStatus(queueInfo);
  const phaseDisplay = run.current_phase ?? "(none)";

  lines.push(`Run: ${run.id}`);
  lines.push(`  Spec:      ${specDisplay}`);
  lines.push(`  Status:    ${formatStatus(run.status)}`);
  lines.push(`  Phase:     ${phaseDisplay}${queueStr ? ` ${queueStr}` : ""}`);
  lines.push(`  Iteration: ${run.iteration}/${run.max_iterations}`);
  lines.push(`  Cost:      $${run.cost_usd.toFixed(2)} / $${run.budget_usd.toFixed(2)}`);
  lines.push(`  Tokens:    ${run.tokens_used.toLocaleString()}`);

  if (run.error) {
    lines.push(`  Error:     ${run.error}`);
  }

  // Agent breakdown
  const counts = summarizeAgentCounts(agents);
  lines.push(`  Agents:    ${counts.summary}`);

  // Module progress
  const moduleProgress = getModuleProgress(db, run.id);
  if (moduleProgress.length > 0) {
    const inline = formatModuleProgressInline(moduleProgress);
    lines.push(`  Modules:   ${inline}`);
  }

  // Detail mode: cost breakdown by role
  if (options.detail) {
    lines.push("");
    lines.push("  Cost by role:");
    const costByRole = new Map<string, number>();
    for (const agent of agents) {
      const current = costByRole.get(agent.role) ?? 0;
      costByRole.set(agent.role, current + agent.cost_usd);
    }
    for (const [role, cost] of costByRole.entries()) {
      lines.push(`    ${role}: $${cost.toFixed(2)}`);
    }
  }

  return lines.join("\n");
}

/**
 * Format a single run's status as a compact one-liner for the summary list.
 * Enriched with spec title and agent breakdown.
 */
export function formatStatusSummaryLine(
  db: SqliteDb,
  run: RunWithSpecTitle,
): string {
  const agents = db.prepare("SELECT * FROM agents WHERE run_id = ? ORDER BY created_at DESC").all(run.id) as AgentRecord[];
  const counts = summarizeAgentCounts(agents);
  const queueInfo = getRunQueueInfo(db, run.id);
  const queueStr = formatQueueStatus(queueInfo);
  const phaseDisplay = run.current_phase ?? "-";
  const specDisplay = run.spec_title
    ? `spec=${run.spec_id} (${run.spec_title})`
    : `spec=${run.spec_id}`;

  return `  ${run.id}  ${formatStatus(run.status)}  ${specDisplay}  phase=${phaseDisplay}${queueStr ? ` ${queueStr}` : ""}  agents=${counts.summary}  $${run.cost_usd.toFixed(2)}/$${run.budget_usd.toFixed(2)}`;
}
