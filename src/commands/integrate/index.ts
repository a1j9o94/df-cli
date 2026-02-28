import { Command } from "commander";
import { integrateRunCommand } from "./run.js";
import { integrateStatusCommand } from "./status.js";

export const integrateCommand = new Command("integrate")
  .description("Compose parallel builder outputs and verify they work together")
  .addHelpText("after", `
After builders complete their modules in isolated worktrees, the integration
phase merges their work and runs checkpoint tests to verify the modules compose
correctly. This catches interface mismatches that individual builders can't see.

Integration is skipped for single-module builds (nothing to compose).

The integration-tester agent:
  1. Merges builder worktrees into an integration branch
  2. Runs each checkpoint test from the buildplan's integration_strategy
  3. Runs the final integration test
  4. Reports pass/fail — if it fails, the pipeline can iterate

Examples:
  $ dark integrate run run_01XYZ               # run integration tests
  $ dark integrate run run_01XYZ --phase 2     # test a specific phase only
  $ dark integrate status                      # see integration history
`)
  .addCommand(integrateRunCommand)
  .addCommand(integrateStatusCommand);
