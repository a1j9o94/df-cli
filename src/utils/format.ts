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
  return JSON.stringify(data, null, 2);
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
 * Format elapsed time from a created_at ISO timestamp to now.
 * Returns human-readable: '5s', '12m 34s', '1h 2m'
 */
export function formatElapsed(createdAt: string): string {
  const elapsed = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
  const secs = Math.max(0, elapsed);

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
 * Returns: '$0.00' for 0, '$0.62', '$1.33'. No ~ prefix (caller adds if estimated).
 */
export function formatCost(costUsd: number): string {
  return `$${costUsd.toFixed(2)}`;
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
