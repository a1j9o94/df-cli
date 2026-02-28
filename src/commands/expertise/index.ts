import { Command } from "commander";
import { expertisePrimeCommand } from "./prime.js";
import { expertiseShowCommand } from "./show.js";

export const expertiseCommand = new Command("expertise")
  .description("Codebase expertise management")
  .addCommand(expertisePrimeCommand)
  .addCommand(expertiseShowCommand);
