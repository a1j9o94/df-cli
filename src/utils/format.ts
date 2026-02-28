import chalk from "chalk";

export function formatJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
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
