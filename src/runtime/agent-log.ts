import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  writeSync,
} from "node:fs";
import { dirname, join } from "node:path";

/**
 * Represents a single event from Claude's --output-format stream-json.
 * The shape is intentionally loose — stream-json can emit many event types
 * and we store them all for diagnostics.
 */
export interface StreamJsonEvent {
  type: string;
  subtype?: string;
  message?: string;
  timestamp?: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  cost_usd?: number;
  tokens_used?: number;
  duration_ms?: number;
  [key: string]: unknown;
}

/**
 * Token usage summary extracted from agent log events.
 */
export interface TokenUsageSummary {
  cost_usd: number;
  tokens_used: number;
  duration_ms: number;
}

/**
 * Writes agent stream-json output to a JSONL file at .df/logs/<agent-id>.jsonl.
 *
 * Usage:
 *   const writer = new AgentLogWriter(logsDir, agentId);
 *   // Pipe stdout lines from `claude --output-format stream-json` here:
 *   writer.writeLine(line);
 *   // Or write structured events:
 *   writer.write(event);
 *   // When the process exits:
 *   writer.close();
 */
export class AgentLogWriter {
  public readonly logPath: string;
  private fd: number | null = null;

  constructor(logsDir: string, agentId: string) {
    this.logPath = join(logsDir, `${agentId}.jsonl`);
  }

  /**
   * Ensure the directory exists and the file descriptor is open.
   */
  private ensureOpen(): void {
    if (this.fd !== null) return;

    const dir = dirname(this.logPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Open for append, create if not exists
    this.fd = openSync(this.logPath, "a");
  }

  /**
   * Write a structured event as a single JSONL line.
   */
  write(event: StreamJsonEvent): void {
    this.ensureOpen();
    const fd = this.fd;
    if (fd === null) return;
    const line = `${JSON.stringify(event)}\n`;
    writeSync(fd, line);
  }

  /**
   * Write a raw line (already JSON string from piped stdout).
   * Adds a trailing newline if not present.
   */
  writeLine(line: string): void {
    this.ensureOpen();
    const fd = this.fd;
    if (fd === null) return;
    const normalized = line.endsWith("\n") ? line : `${line}\n`;
    writeSync(fd, normalized);
  }

  /**
   * Close the file descriptor. Safe to call multiple times.
   */
  close(): void {
    if (this.fd !== null) {
      closeSync(this.fd);
      this.fd = null;
    }
  }
}

/**
 * Parse a JSONL log file into an array of StreamJsonEvent.
 * Returns an empty array if the file doesn't exist.
 * Silently skips malformed lines.
 */
export function parseAgentLog(logPath: string): StreamJsonEvent[] {
  if (!existsSync(logPath)) {
    return [];
  }

  const content = readFileSync(logPath, "utf-8");
  const lines = content.split("\n").filter((l) => l.trim().length > 0);
  const events: StreamJsonEvent[] = [];

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as StreamJsonEvent;
      events.push(parsed);
    } catch {
      // Skip malformed lines
    }
  }

  return events;
}

/**
 * Extract the last tool_use event from a list of log events.
 * Useful for crash diagnostics — "what was the agent doing when it died?"
 */
export function getLastToolCall(events: StreamJsonEvent[]): StreamJsonEvent | undefined {
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].subtype === "tool_use") {
      return events[i];
    }
  }
  return undefined;
}

/**
 * Extract token usage summary from log events.
 * Accumulates across all result events (handles partial results).
 */
export function getTokenUsage(events: StreamJsonEvent[]): TokenUsageSummary {
  let cost_usd = 0;
  let tokens_used = 0;
  let duration_ms = 0;

  for (const event of events) {
    if (event.type === "result") {
      cost_usd += event.cost_usd ?? 0;
      tokens_used += event.tokens_used ?? 0;
      duration_ms += event.duration_ms ?? 0;
    }
  }

  return { cost_usd, tokens_used, duration_ms };
}

/**
 * Diagnostics summary for an agent's log.
 */
export interface AgentDiagnostics {
  eventCount: number;
  hasResult: boolean;
  lastToolCall: StreamJsonEvent | undefined;
  tokenUsage: TokenUsageSummary;
}

/**
 * Get comprehensive diagnostics from an agent's log file.
 * Combines all parsing utilities into a single call.
 * Useful for crash analysis and post-run reporting.
 */
export function getAgentDiagnostics(logPath: string): AgentDiagnostics {
  const events = parseAgentLog(logPath);
  return {
    eventCount: events.length,
    hasResult: events.some((e) => e.type === "result"),
    lastToolCall: getLastToolCall(events),
    tokenUsage: getTokenUsage(events),
  };
}

/**
 * Get the path to the logs directory for a given .df directory.
 */
export function getLogsDir(dfDir: string): string {
  return join(dfDir, "logs");
}

/**
 * Get the path to a specific agent's log file.
 */
export function getAgentLogPath(dfDir: string, agentId: string): string {
  return join(dfDir, "logs", `${agentId}.jsonl`);
}
