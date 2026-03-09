import { Command } from "commander";
import { loadRegistry } from "../../utils/registry.js";

export const projectsListCommand = new Command("list")
  .description("List all registered projects and workspaces")
  .option("--json", "Output as JSON")
  .action((options: { json?: boolean }) => {
    const entries = loadRegistry();

    if (entries.length === 0) {
      if (!options.json) {
        console.log("No projects registered. Run 'dark init' in a project to register it.");
      } else {
        console.log("[]");
      }
      return;
    }

    if (options.json) {
      console.log(JSON.stringify(entries, null, 2));
      return;
    }

    console.log(`Registered projects (${entries.length}):\n`);
    for (const entry of entries) {
      const status = entry.lastRunStatus ? ` [${entry.lastRunStatus}]` : "";
      const date = entry.lastRunDate ? ` (${entry.lastRunDate})` : "";
      console.log(`  ${entry.type === "workspace" ? "📁" : "📦"} ${entry.name}${status}${date}`);
      console.log(`    ${entry.path}`);
    }
  });
