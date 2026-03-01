import { Command } from "commander";
import { scenarioCreateCommand } from "./create.js";
import { scenarioListCommand } from "./list.js";

export const scenarioCommand = new Command("scenario")
  .description("Manage holdout test scenarios")
  .addCommand(scenarioCreateCommand)
  .addCommand(scenarioListCommand);
