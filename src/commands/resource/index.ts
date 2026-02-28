import { Command } from "commander";
import { resourceStatusCommand } from "./status.js";
import { resourceSetCommand } from "./set.js";

export const resourceCommand = new Command("resource")
  .description("Track and limit shared resources — worktrees, API slots")
  .addHelpText("after", `
Resources are shared capacity pools that prevent the pipeline from spawning
too many agents at once. Two resources are created by default:

  worktrees   — max git worktrees (default: 6)
  api_slots   — max concurrent API calls (default: 4)

The pipeline atomically acquires a resource before spawning an agent and
releases it when the agent completes. If capacity is exhausted, agents queue.

  $ dark resource status                       # see all resources and usage
  $ dark resource set worktrees --capacity 8   # increase worktree limit
  $ dark resource set api_slots --capacity 2   # throttle API usage
`)
  .addCommand(resourceStatusCommand)
  .addCommand(resourceSetCommand);
