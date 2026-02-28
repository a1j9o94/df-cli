import { Command } from "commander";

export const runListCommand = new Command("list")
  .description("List pipeline runs")
  .option("--spec <id>", "Filter by spec ID")
  .option("--json", "Output as JSON")
  .action(async (_options) => {
    console.log("Not implemented yet");
  });
