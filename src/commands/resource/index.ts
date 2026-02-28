import { Command } from "commander";
import { resourceStatusCommand } from "./status.js";
import { resourceSetCommand } from "./set.js";

export const resourceCommand = new Command("resource")
  .description("Resource management")
  .addCommand(resourceStatusCommand)
  .addCommand(resourceSetCommand);
