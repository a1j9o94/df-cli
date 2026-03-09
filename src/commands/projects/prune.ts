import { Command } from "commander";
import { pruneRegistry } from "../../utils/registry.js";

export const projectsPruneCommand = new Command("prune")
  .description("Remove registry entries for projects that no longer exist on disk")
  .action(() => {
    const result = pruneRegistry();

    if (result.removed.length === 0) {
      console.log("No stale entries found. Registry is clean.");
      return;
    }

    console.log(`Pruned ${result.removed.length} stale entries:`);
    for (const path of result.removed) {
      console.log(`  ✗ ${path}`);
    }
    console.log(`\n${result.remaining.length} entries remaining.`);
  });
