import { Command } from "commander";
import { agentListCommand } from "./list.js";
import { agentHeartbeatCommand } from "./heartbeat.js";
import { agentCompleteCommand } from "./complete.js";
import { agentFailCommand } from "./fail.js";

export const agentCommand = new Command("agent")
  .description("Manage agents")
  .addCommand(agentListCommand)
  .addCommand(agentHeartbeatCommand)
  .addCommand(agentCompleteCommand)
  .addCommand(agentFailCommand);
