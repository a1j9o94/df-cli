import { Command } from "commander";
import { runListCommand } from "./list.js";

export const runCommand = new Command("run")
  .description("View pipeline runs — each 'dark build' creates a run with phases and agents")
  .addHelpText("after", `
A run is a single execution of the pipeline for a spec. It tracks status,
current phase, iteration count, cost, and all agents spawned during execution.

Runs go through statuses: pending → running → completed/failed/cancelled

Each run can iterate (retry from the build phase) up to max_iterations times
if evaluation fails. Cost and token usage accumulate across iterations.

  $ dark run list                              # all runs
  $ dark run list --spec spec_01ABC            # runs for a specific spec
  $ dark run list --json                       # JSON output
`)
  .addCommand(runListCommand);
