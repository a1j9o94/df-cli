import { Command } from "commander";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { findDfDir } from "../../utils/config.js";
import { formatJson } from "../../utils/format.js";
import { log } from "../../utils/logger.js";

export const expertiseShowCommand = new Command("show")
  .description("Show cached codebase expertise")
  .option("--json", "Output as JSON")
  .action(async (options: { json?: boolean }) => {
    const dfDir = findDfDir();
    if (!dfDir) {
      log.error("Not in a Dark Factory project.");
      process.exit(1);
    }

    const summaryPath = join(dfDir, "expertise", "summary.json");
    const treePath = join(dfDir, "expertise", "file-tree.txt");

    if (!existsSync(summaryPath)) {
      log.error("No expertise cache found. Run: df expertise prime");
      process.exit(1);
    }

    const summary = JSON.parse(readFileSync(summaryPath, "utf-8"));

    if (options.json) {
      const tree = existsSync(treePath) ? readFileSync(treePath, "utf-8").split("\n") : [];
      console.log(formatJson({ ...summary, files: tree }));
      return;
    }

    console.log(`Codebase Expertise (generated ${summary.generatedAt}):\n`);
    console.log(`  Total files: ${summary.totalFiles}`);
    console.log(`  Total lines: ${summary.totalLines.toLocaleString()}\n`);

    console.log("  By extension:");
    const exts = Object.entries(summary.byExtension) as [string, { files: number; lines: number }][];
    exts.sort((a, b) => b[1].lines - a[1].lines);
    for (const [ext, info] of exts) {
      console.log(`    ${ext.padEnd(8)} ${String(info.files).padStart(5)} files  ${info.lines.toLocaleString().padStart(8)} lines`);
    }
  });
