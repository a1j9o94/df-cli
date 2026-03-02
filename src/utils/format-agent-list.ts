import type { AgentRecord } from "../types/agent.js";
import { formatElapsed, formatRelativeTime } from "./time-format.js";
import { computeElapsedMs } from "./agent-enrichment.js";

export interface FormatAgentListOptions {
  /** Number of files changed in the agent's worktree (from git status) */
  filesChanged?: number;
}

/**
 * Format a single agent entry for the enriched `dark agent list` output.
 *
 * Output format:
 * ```
 * agt_01XYZ  builder-foo (builder)  running  12m 34s  ~$0.62  3 files  module=foo
 *   worktree: /var/folders/.../foo-mm8abc
 *   last heartbeat: 2m ago
 * ```
 */
export function formatAgentListEntry(agent: AgentRecord, options: FormatAgentListOptions = {}): string {
  const parts: string[] = [];

  // Line 1: main info
  parts.push(`  ${agent.id}  ${agent.name} (${agent.role})  ${agent.status}`);

  // Elapsed time: use total_active_ms for completed agents, compute live for active
  const elapsed = agent.status === "completed" || agent.status === "failed" || agent.status === "killed"
    ? agent.total_active_ms
    : computeElapsedMs(agent.created_at, agent.status);

  if (elapsed > 0) {
    parts.push(`  ${formatElapsed(elapsed)}`);
  }

  // Cost: show actual cost_usd, or estimated if only elapsed is known
  if (agent.cost_usd > 0) {
    parts.push(`  ~$${agent.cost_usd.toFixed(2)}`);
  }

  // Files changed (if provided externally from git status)
  if (options.filesChanged !== undefined && options.filesChanged > 0) {
    parts.push(`  ${options.filesChanged} files`);
  }

  // Module
  if (agent.module_id) {
    parts.push(`  module=${agent.module_id}`);
  }

  const lines: string[] = [parts.join("")];

  // Line 2: worktree path (if present)
  if (agent.worktree_path) {
    lines.push(`    worktree: ${agent.worktree_path}`);
  }

  // Line 3: last heartbeat
  lines.push(`    last heartbeat: ${formatRelativeTime(agent.last_heartbeat)}`);

  return lines.join("\n");
}
