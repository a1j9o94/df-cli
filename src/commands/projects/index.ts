import { Command } from "commander";
import { projectsListCommand } from "./list.js";
import { projectsPruneCommand } from "./prune.js";

export const projectsCommand = new Command("projects")
  .description("Manage the global project registry")
  .addCommand(projectsListCommand)
  .addCommand(projectsPruneCommand);
