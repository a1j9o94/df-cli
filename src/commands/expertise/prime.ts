import { Command } from "commander";
import { writeFileSync, readdirSync, statSync, readFileSync } from "node:fs";
import { join, relative, extname } from "node:path";
import { findDfDir } from "../../utils/config.js";
import { formatJson } from "../../utils/format.js";
import { log } from "../../utils/logger.js";

const CODE_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs",
  ".java", ".kt", ".rb", ".php", ".c", ".cpp", ".h",
  ".css", ".scss", ".html", ".vue", ".svelte",
]);

export const expertisePrimeCommand = new Command("prime")
  .description("Generate codebase expertise cache")
  .option("--paths <paths>", "Comma-separated paths to analyze", ".")
  .action(async (options: { paths: string }) => {
    const dfDir = findDfDir();
    if (!dfDir) {
      log.error("Not in a Dark Factory project.");
      process.exit(1);
    }

    const projectRoot = join(dfDir, "..");
    const paths = options.paths.split(",").map((p) => p.trim());
    const expertiseDir = join(dfDir, "expertise");

    const fileTree: string[] = [];
    const fileSummaries: Record<string, { lines: number; ext: string }> = {};

    for (const basePath of paths) {
      const absPath = join(projectRoot, basePath);
      walkDir(absPath, projectRoot, fileTree, fileSummaries);
    }

    // Write file tree
    writeFileSync(
      join(expertiseDir, "file-tree.txt"),
      fileTree.join("\n"),
    );

    // Write summary
    const extCounts: Record<string, { files: number; lines: number }> = {};
    for (const [, info] of Object.entries(fileSummaries)) {
      if (!extCounts[info.ext]) extCounts[info.ext] = { files: 0, lines: 0 };
      extCounts[info.ext].files++;
      extCounts[info.ext].lines += info.lines;
    }

    const summary = {
      totalFiles: fileTree.length,
      totalLines: Object.values(fileSummaries).reduce((sum, s) => sum + s.lines, 0),
      byExtension: extCounts,
      generatedAt: new Date().toISOString(),
    };

    writeFileSync(
      join(expertiseDir, "summary.json"),
      formatJson(summary),
    );

    log.success(`Expertise primed: ${fileTree.length} files indexed`);
    log.info(`  File tree: ${join(expertiseDir, "file-tree.txt")}`);
    log.info(`  Summary: ${join(expertiseDir, "summary.json")}`);
  });

function walkDir(
  dir: string,
  projectRoot: string,
  files: string[],
  summaries: Record<string, { lines: number; ext: string }>,
): void {
  const SKIP = new Set(["node_modules", ".git", ".df", "dist", "build", "coverage", ".next"]);

  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }

  for (const entry of entries) {
    if (SKIP.has(entry) || entry.startsWith(".")) continue;

    const fullPath = join(dir, entry);
    let stat;
    try {
      stat = statSync(fullPath);
    } catch {
      continue;
    }

    if (stat.isDirectory()) {
      walkDir(fullPath, projectRoot, files, summaries);
    } else if (stat.isFile()) {
      const ext = extname(entry);
      if (CODE_EXTENSIONS.has(ext)) {
        const rel = relative(projectRoot, fullPath);
        files.push(rel);
        try {
          const content = readFileSync(fullPath, "utf-8");
          summaries[rel] = { lines: content.split("\n").length, ext };
        } catch {
          summaries[rel] = { lines: 0, ext };
        }
      }
    }
  }
}
