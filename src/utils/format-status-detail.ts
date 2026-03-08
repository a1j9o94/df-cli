import type { SqliteDb } from "../db/index.js";
import type { RunWithSpecTitle } from "../db/queries/status-queries.js";
import type { AgentRecord } from "../types/agent.js";
import type { EventRecord } from "../types/event.js";
import { getModuleProgress } from "../db/queries/status-queries.js";
import { formatModuleProgressInline } from "./format-module-progress.js";
import { summarizeAgentCounts, computeElapsedMs } from "./agent-enrichment.js";
import { formatStatus } from "./format.js";
import { formatElapsed } from "./time-format.js";
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

  // Detail mode: phase timeline, module grid, evaluation, cost breakdown
  if (options.detail) {
    // Phase timeline
    const phaseEvents = db.prepare(
      "SELECT * FROM events WHERE run_id = ? AND type IN ('phase-started', 'phase-completed') ORDER BY created_at ASC, rowid ASC"
    ).all(run.id) as EventRecord[];

    if (phaseEvents.length > 0) {
      lines.push("");
      lines.push("  Phase timeline:");
      const phaseTimeline = buildPhaseTimeline(phaseEvents);
      for (const phase of phaseTimeline) {
        if (phase.elapsed) {
          lines.push(`    ${phase.name}: ${formatElapsed(phase.elapsed)}${phase.active ? " (active)" : ""}`);
        } else {
          lines.push(`    ${phase.name}: (active)`);
        }
      }
    }

    // Module grid/details
    if (moduleProgress.length > 0) {
      lines.push("");
      lines.push("  Module details:");
      for (const mod of moduleProgress) {
        const agent = mod.agentName ?? "-";
        const elapsed = mod.elapsedMs > 0 ? formatElapsed(mod.elapsedMs) : "-";
        const cost = mod.costUsd > 0 ? `$${mod.costUsd.toFixed(2)}` : "-";
        lines.push(`    ${mod.moduleId}: ${mod.status}  builder=${agent}  elapsed=${elapsed}  cost=${cost}`);
      }
    }

    // Evaluation results
    const evalEvents = db.prepare(
      "SELECT * FROM events WHERE run_id = ? AND type IN ('evaluation-passed', 'evaluation-failed') ORDER BY created_at DESC"
    ).all(run.id) as EventRecord[];

    lines.push("");
    if (evalEvents.length > 0) {
      lines.push("  Evaluation:");
      for (const evt of evalEvents) {
        const data = evt.data ? JSON.parse(evt.data) : {};
        const mode = data.mode ?? "unknown";
        const score = data.score !== undefined ? ` score=${data.score}` : "";
        const passed = data.passed !== undefined ? ` passed=${data.passed}/${data.total}` : "";
        lines.push(`    ${mode}: ${evt.type === "evaluation-passed" ? "PASSED" : "FAILED"}${score}${passed}`);
      }
    } else {
      lines.push("  Evaluation: Not yet evaluated");
    }

    // Cost breakdown by role
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

interface PhaseTimelineEntry {
  name: string;
  elapsed: number; // ms, 0 if still active
  active: boolean;
}

/**
 * Build phase timeline from phase-started and phase-completed events.
 */
function buildPhaseTimeline(events: EventRecord[]): PhaseTimelineEntry[] {
  const phases = new Map<string, { startedAt: string; completedAt?: string }>();
  const phaseOrder: string[] = [];

  for (const evt of events) {
    const data = evt.data ? JSON.parse(evt.data) : {};
    const phaseName = data.phase;
    if (!phaseName) continue;

    if (evt.type === "phase-started") {
      if (!phases.has(phaseName)) {
        phaseOrder.push(phaseName);
      }
      phases.set(phaseName, { startedAt: evt.created_at, ...phases.get(phaseName), });
      // Re-set startedAt in case of duplicate events
      const existing = phases.get(phaseName)!;
      existing.startedAt = evt.created_at;
    } else if (evt.type === "phase-completed") {
      const existing = phases.get(phaseName);
      if (existing) {
        existing.completedAt = evt.created_at;
      }
    }
  }

  return phaseOrder.map(name => {
    const phase = phases.get(name)!;
    if (phase.completedAt) {
      const elapsed = new Date(phase.completedAt).getTime() - new Date(phase.startedAt).getTime();
      return { name, elapsed, active: false };
    }
    // Still active
    const elapsed = Date.now() - new Date(phase.startedAt).getTime();
    return { name, elapsed: 0, active: true };
  });
}
