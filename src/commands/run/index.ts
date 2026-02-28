import { Command } from "commander";
import { runListCommand } from "./list.js";

export const runCommand = new Command("run")
  .description("Manage pipeline runs")
  .addCommand(runListCommand);
