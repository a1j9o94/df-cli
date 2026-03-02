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
