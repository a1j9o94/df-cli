import { Command } from "commander";
import { workspaceInitCommand } from "./init.js";

export const workspaceCommand = new Command("workspace")
  .description("Manage workspaces — groups of related Dark Factory projects")
  .addCommand(workspaceInitCommand);
