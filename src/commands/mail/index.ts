import { Command } from "commander";
import { mailSendCommand } from "./send.js";
import { mailCheckCommand } from "./check.js";

export const mailCommand = new Command("mail")
  .description("Inter-agent messaging")
  .addCommand(mailSendCommand)
  .addCommand(mailCheckCommand);
