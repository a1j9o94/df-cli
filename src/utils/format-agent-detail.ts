import type { AgentDetailResult } from "../db/queries/agent-queries.js";
import { formatElapsed, formatRelativeTime } from "./time-format.js";
import { computeElapsedMs } from "./agent-enrichment.js";

/**
 * Format the full detail view for `dark agent show <id>`.
 * Shows all agent fields, recent events, and messages.
 */
export function formatAgentDetail(detail: AgentDetailResult): string {
  const { agent, events, messages } = detail;

  const elapsed = computeElapsedMs(agent.created_at, agent.status) || agent.total_active_ms;

  const lines: string[] = [
    `Agent: ${agent.id}`,
    "",
    `  Name:          ${agent.name}`,
    `  Role:          ${agent.role}`,
    `  Status:        ${agent.status}`,
    `  PID:           ${agent.pid ?? "none"}`,
    `  Module:        ${agent.module_id ?? "none"}`,
    `  Worktree:      ${agent.worktree_path ?? "none"}`,
    `  Branch:        ${agent.branch_name ?? "none"}`,
    `  Elapsed:       ${formatElapsed(elapsed)}`,
    `  Heartbeat:     ${formatRelativeTime(agent.last_heartbeat)}`,
    `  Cost:          $${agent.cost_usd.toFixed(2)}`,
    `  Tokens:        ${agent.tokens_used.toLocaleString()}`,
    `  TDD Phase:     ${agent.tdd_phase ?? "none"}`,
    `  TDD Cycles:    ${agent.tdd_cycles}`,
    `  Created:       ${agent.created_at}`,
    `  Updated:       ${agent.updated_at}`,
  ];

  if (agent.error) {
    lines.push(`  Error:         ${agent.error}`);
  }

  // Events section
  lines.push("");
  if (events.length > 0) {
    lines.push(`  Events (${events.length}):`);
    for (const evt of events) {
      const data = evt.data ? ` ${evt.data}` : "";
      lines.push(`    ${formatRelativeTime(evt.created_at)}  ${evt.type}${data}`);
    }
  } else {
    lines.push("  No events");
  }

  // Messages section
  lines.push("");
  if (messages.length > 0) {
    lines.push(`  Messages (${messages.length}):`);
    for (const msg of messages) {
      const from = msg.from_agent_id;
      const read = msg.read ? "" : " [unread]";
      const body = msg.body.length > 80 ? `${msg.body.slice(0, 77)}...` : msg.body;
      lines.push(`    ${formatRelativeTime(msg.created_at)}  from ${from}${read}: ${body}`);
    }
  } else {
    lines.push("  No messages");
  }

  return lines.join("\n");
}
