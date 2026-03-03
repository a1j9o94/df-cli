import { Command } from "commander";
import { researchAddCommand } from "./add.js";
import { researchListCommand } from "./list.js";
import { researchShowCommand } from "./show.js";

export const researchCommand = new Command("research")
  .description(
    "Save and share research findings across agents — the shared clipboard"
  )
  .addHelpText(
    "after",
    `
Agents save research findings (URLs, code snippets, API docs excerpts,
screenshots) so other agents can reference them later. The architect
searches the web, reads docs, takes screenshots — this gives those
findings a persistent, shared home.

Add text research:
  $ dark research add <agent-id> --label "Stripe SDK docs" \\
      --content "Use stripe@14.x — breaking changes in webhook signatures"

Add file research:
  $ dark research add <agent-id> --label "Checkout flow" \\
      --file /tmp/screenshot.png

Tag to a module:
  $ dark research add <agent-id> --label "Payment API" \\
      --content "REST endpoint docs" --module payments

List research:
  $ dark research list --run-id <id>
  $ dark research list --run-id <id> --module payments

Show a specific artifact:
  $ dark research show <research-id>
`
  )
  .addCommand(researchAddCommand)
  .addCommand(researchListCommand)
  .addCommand(researchShowCommand);
