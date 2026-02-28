import { Command } from "commander";
import { specCreateCommand } from "./create.js";
import { specShowCommand } from "./show.js";
import { specListCommand } from "./list.js";

export const specCommand = new Command("spec")
  .description("Manage specifications")
  .addCommand(specCreateCommand)
  .addCommand(specShowCommand)
  .addCommand(specListCommand);
