import { Command } from "commander";
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { findDfDir } from "../../utils/config.js";
import { formatJson } from "../../utils/format.js";
import { log } from "../../utils/logger.js";

export const scenarioListCommand = new Command("list")
  .description("List holdout scenarios")
  .option("--type <type>", "Filter by type: functional or change")
  .option("--json", "Output as JSON")
  .action(async (options: { type?: string; json?: boolean }) => {
    const dfDir = findDfDir();
    if (!dfDir) {
      log.error("Not in a Dark Factory project.");
      process.exit(1);
    }

    const scenarioDir = join(dfDir, "scenarios");
    if (!existsSync(scenarioDir)) {
      if (options.json) {
        console.log("[]");
      } else {
        log.info("No scenarios found.");
      }
      return;
    }

    const scenarios: { name: string; type: string; path: string }[] = [];

    for (const type of ["functional", "change"]) {
      if (options.type && options.type !== type) continue;
      const typeDir = join(scenarioDir, type);
      if (!existsSync(typeDir)) continue;

      for (const file of readdirSync(typeDir)) {
        if (!file.endsWith(".md")) continue;
        scenarios.push({
          name: file.replace(/\.md$/, ""),
          type,
          path: join(typeDir, file),
        });
      }
    }

    if (options.json) {
      console.log(formatJson(scenarios));
    } else if (scenarios.length === 0) {
      log.info("No scenarios found.");
    } else {
      for (const s of scenarios) {
        console.log(`  ${s.type.padEnd(12)} ${s.name}`);
      }
    }
  });
