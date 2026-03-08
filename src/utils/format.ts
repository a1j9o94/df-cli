import chalk from "chalk";

export interface FormatJsonOptions {
  /** Field names to exclude from the output (applies to objects and arrays of objects) */
  excludeFields?: string[];
}

export function formatJson(data: unknown, options?: FormatJsonOptions): string {
  const excludeFields = options?.excludeFields;
  if (excludeFields && excludeFields.length > 0) {
    data = stripFields(data, excludeFields);
  }
  data = sanitizeControlChars(data);
  return JSON.stringify(data, null, 2);
}

/**
 * Regex matching control characters that should be stripped from JSON string values.
 * Preserves \t (0x09), \n (0x0A), and \r (0x0D) which are common whitespace.
 * Strips: 0x00-0x08, 0x0B, 0x0C, 0x0E-0x1F
 */
// eslint-disable-next-line no-control-regex
const CONTROL_CHAR_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F]/g;

/**
 * Recursively sanitize string values in a data structure by removing
 * problematic control characters (null bytes, etc.) that may cause
 * issues with external JSON parsers (Python json.loads, jq).
 */
function sanitizeControlChars(data: unknown): unknown {
  if (typeof data === "string") {
    return data.replace(CONTROL_CHAR_RE, "");
  }
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeControlChars(item));
  }
  if (data !== null && typeof data === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      result[key] = sanitizeControlChars(value);
    }
    return result;
  }
  return data;
}

function stripFields(data: unknown, fields: string[]): unknown {
  if (Array.isArray(data)) {
    return data.map((item) => stripFields(item, fields));
  }
  if (data !== null && typeof data === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (!fields.includes(key)) {
        result[key] = stripFields(value, fields);
      }
    }
    return result;
  }
  return data;
}

export function formatStatus(status: string): string {
  switch (status) {
    case "running":
    case "active":
      return chalk.green(status);
    case "completed":
    case "passed":
      return chalk.greenBright(status);
    case "pending":
    case "draft":
      return chalk.gray(status);
    case "failed":
    case "killed":
    case "rejected":
      return chalk.red(status);
    case "paused":
    case "superseded":
      return chalk.yellow(status);
    default:
      return status;
  }
}

export function formatTable(headers: string[], rows: string[][]): string {
  if (headers.length === 0) return "";

  // Calculate column widths
  const widths = headers.map((h, i) => {
    const dataMax = rows.reduce((max, row) => Math.max(max, stripAnsi(row[i] ?? "").length), 0);
    return Math.max(h.length, dataMax);
  });

  // Format header
  const headerLine = headers.map((h, i) => h.padEnd(widths[i])).join("  ");
  const separator = widths.map((w) => "-".repeat(w)).join("  ");

  // Format rows
  const dataLines = rows.map((row) =>
    row.map((cell, i) => {
      const stripped = stripAnsi(cell ?? "");
      const padding = widths[i] - stripped.length;
      return (cell ?? "") + " ".repeat(Math.max(0, padding));
    }).join("  "),
  );

  return [headerLine, separator, ...dataLines].join("\n");
}

function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

/**
 * Format elapsed time as human-readable: '5s', '12m 34s', '1h 2m'.
 *
 * Accepts either:
 * - An ISO timestamp string (computes elapsed from that time to now)
 * - A number of milliseconds (formats that duration directly)
 */
export function formatElapsed(input: string | number): string {
  let totalMs: number;
  if (typeof input === "number") {
    totalMs = input;
  } else {
    totalMs = Date.now() - new Date(input).getTime();
  }

  const secs = Math.max(0, Math.floor(totalMs / 1000));

  if (secs < 60) {
    return `${secs}s`;
  }

  const minutes = Math.floor(secs / 60);
  const remainingSecs = secs % 60;

  if (minutes < 60) {
    return `${minutes}m ${remainingSecs}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return `${hours}h ${remainingMins}m`;
}

/**
 * Format an ISO date as relative time from now.
 * Returns: '2m ago', '1h ago', 'just now', 'never' (for null input)
 */
export function formatRelativeTime(isoDate: string | null): string {
  if (isoDate === null) return "never";

  const elapsed = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);

  if (elapsed < 10) return "just now";
  if (elapsed < 60) return `${elapsed}s ago`;

  const minutes = Math.floor(elapsed / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Format USD cost with dollar sign.
 * Returns: '$0.00' for 0, '$0.62', '$1.33'.
 * When isEstimate is true, prefixes with '~': '~$0.62'
 */
export function formatCost(costUsd: number, isEstimate?: boolean): string {
  const prefix = isEstimate ? "~" : "";
  return `${prefix}$${costUsd.toFixed(2)}`;
}

/**
 * Format token count with comma separators.
 * Returns: '15,234', '1,000,000'
 */
export function formatTokens(count: number): string {
  return count.toLocaleString("en-US");
}

/**
 * Format a file count with proper pluralization.
 * Returns: '0 files', '1 file', '3 files'
 */
export function formatFilesChanged(count: number): string {
  return count === 1 ? "1 file" : `${count} files`;
}

/** Info about a module's build progress */
export interface ModuleProgressInfo {
  name: string;
  status: string;
  elapsed: string | undefined;
}

/**
 * Format per-module build progress as a single line.
 * Returns: 'merge-lock(done) engine-rebase(building 12m 34s) queue-vis(building 11m 0s)'
 */
export function formatModuleProgress(modules: ModuleProgressInfo[]): string {
  if (modules.length === 0) return "";

  return modules
    .map((m) => {
      const label = moduleStatusLabel(m.status);
      if (m.elapsed && (m.status === "running" || m.status === "spawning")) {
        return `${m.name}(${label} ${m.elapsed})`;
      }
      if (m.elapsed && m.status === "failed") {
        return `${m.name}(${label} ${m.elapsed})`;
      }
      return `${m.name}(${label})`;
    })
    .join(" ");
}

function moduleStatusLabel(status: string): string {
  switch (status) {
    case "completed":
      return "done";
    case "running":
    case "spawning":
      return "building";
    case "pending":
      return "pending";
    case "failed":
    case "killed":
      return "failed";
    default:
      return status;
  }
}
