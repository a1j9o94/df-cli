import { Command } from "commander";
import { join } from "node:path";
import { findDfDir } from "../../utils/config.js";
import { getDb } from "../../db/index.js";
import { getSpecLineage, getSpecChildren } from "../../db/queries/spec-lineage.js";
import { formatJson, formatStatus } from "../../utils/format.js";
import { log } from "../../utils/logger.js";
import type { SqliteDb } from "../../db/index.js";

interface HistoryOptions {
  json?: boolean;
}

/**
 * Format spec history for display.
 * Shows the full ancestor chain from root to the given spec.
 */
export function formatSpecHistory(
  db: SqliteDb,
  specId: string,
  options?: HistoryOptions,
): string {
  const chain = getSpecLineage(db, specId);

  if (!chain) {
    return `Spec not found: ${specId}`;
  }

  if (options?.json) {
    return formatJson(chain);
  }

  if (chain.length === 1) {
    const spec = chain[0];
    return `Spec History: ${spec.id}\n\n  ${spec.id}  ${spec.status}  ${spec.title}\n  (no parent lineage)`;
  }

  // Build the chain display
  const lines: string[] = [`Spec History: ${specId}\n`];

  for (let i = 0; i < chain.length; i++) {
    const spec = chain[i];
    const isLast = i === chain.length - 1;
    const prefix = i === 0 ? "  " : "  → ";

    lines.push(`${prefix}${spec.id}  ${spec.status}  ${spec.title}`);
  }

  return lines.join("\n");
}

export const specHistoryCommand = new Command("history")
  .description("Show the lineage chain for a spec (parent → child → grandchild)")
  .argument("<spec-id>", "Specification ID")
  .option("--json", "Output as JSON")
  .action(async (specId: string, options: { json?: boolean }) => {
    const dfDir = findDfDir();
    if (!dfDir) {
      log.error("Not in a Dark Factory project. Run 'dark init' first.");
      process.exit(1);
    }

    const db = getDb(join(dfDir, "state.db"));
    const output = formatSpecHistory(db, specId, options);
    console.log(output);
  });
