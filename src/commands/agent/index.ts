import { Command } from "commander";
import { agentListCommand } from "./list.js";
import { agentHeartbeatCommand } from "./heartbeat.js";
import { agentCompleteCommand } from "./complete.js";
import { agentFailCommand } from "./fail.js";

export const agentCommand = new Command("agent")
  .description("Manage agent lifecycle — list, heartbeat, complete, or fail agents")
  .addHelpText("after", `
Agents are Claude Code CLI processes spawned by the pipeline. Each agent has a
role (orchestrator, architect, builder, evaluator, merger, integration-tester),
a status (pending → spawning → running → completed/failed/killed), and a PID.

The pipeline manages agents automatically during "dark build", but these commands
let you inspect and control them directly. Agents themselves also call these
commands — a builder calls "dark agent heartbeat" periodically and
"dark agent complete" when finished.

Heartbeats prevent stale agent detection. If an agent stops sending heartbeats
for longer than the configured timeout (default 90s), the pipeline kills it.

  $ dark agent list                            # all agents
  $ dark agent list --run-id run_01XYZ         # agents for a specific run
  $ dark agent list --role builder --json      # builders only, JSON output
  $ dark agent heartbeat agt_01ABC             # send heartbeat (agents call this)
  $ dark agent complete agt_01ABC              # mark as completed
  $ dark agent fail agt_01ABC --error "tests failed"
`)
  .addCommand(agentListCommand)
  .addCommand(agentHeartbeatCommand)
  .addCommand(agentCompleteCommand)
  .addCommand(agentFailCommand);
