import { Command } from "commander";
import { integrateRunCommand } from "./run.js";
import { integrateStatusCommand } from "./status.js";

export const integrateCommand = new Command("integrate")
  .description("Integration testing")
  .addCommand(integrateRunCommand)
  .addCommand(integrateStatusCommand);
