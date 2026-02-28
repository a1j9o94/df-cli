import { Command } from "commander";
import { mailSendCommand } from "./send.js";
import { mailCheckCommand } from "./check.js";

export const mailCommand = new Command("mail")
  .description("DB-backed messaging between agents — the coordination channel")
  .addHelpText("after", `
Agents communicate through a SQLite-backed mail system, not direct process
communication. This makes messages durable, inspectable, and debuggable.

Messages can be addressed to:
  - A specific agent:    --to agt_01ABC
  - An entire role:      --to @builder  (all builders in the run)
  - A contract group:    --to @contract:ctr_01ABC  (all agents bound to it)

Agents poll for messages via "dark mail check". The pipeline also uses mail
to deliver instructions (e.g., revision feedback to architects).

Send:
  $ dark mail send --from agt_01ABC --to agt_01DEF \\
      --body "Contract updated, please re-ack" --run-id run_01XYZ
  $ dark mail send --from agt_01ABC --to @builder \\
      --body "Integration branch ready" --run-id run_01XYZ

Check:
  $ dark mail check --agent agt_01ABC              # all messages
  $ dark mail check --agent agt_01ABC --unread     # new messages only
  $ dark mail check --agent agt_01ABC --mark-read  # mark as read after display
  $ dark mail check --agent agt_01ABC --json       # for programmatic consumption
`)
  .addCommand(mailSendCommand)
  .addCommand(mailCheckCommand);
