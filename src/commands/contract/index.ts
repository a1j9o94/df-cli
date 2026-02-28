import { Command } from "commander";
import { contractListCommand } from "./list.js";
import { contractShowCommand } from "./show.js";
import { contractUpdateCommand } from "./update.js";
import { contractAcknowledgeCommand } from "./acknowledge.js";
import { contractCheckCommand } from "./check.js";

export const contractCommand = new Command("contract")
  .description("Manage interface contracts")
  .addCommand(contractListCommand)
  .addCommand(contractShowCommand)
  .addCommand(contractUpdateCommand)
  .addCommand(contractAcknowledgeCommand)
  .addCommand(contractCheckCommand);
