import { Command } from "commander";
import { contractListCommand } from "./list.js";
import { contractShowCommand } from "./show.js";
import { contractUpdateCommand } from "./update.js";
import { contractAcknowledgeCommand } from "./acknowledge.js";
import { contractCheckCommand } from "./check.js";

export const contractCommand = new Command("contract")
  .description("Interface contracts between parallel builders — the coordination mechanism")
  .addHelpText("after", `
Contracts define the interfaces between modules. When builders work in parallel
worktrees, contracts are the only thing keeping them aligned. A contract is a
precise type definition, API shape, or data format that multiple modules depend on.

Each contract has bindings: which agent implements it, which agents consume it.
Builders must acknowledge their contracts before starting work. If a builder
needs a contract changed, they send mail to the architect — they cannot modify
contracts directly.

Lifecycle:
  1. Architect defines contracts in the buildplan
  2. "dark architect submit-plan" extracts them into the DB
  3. Builders acknowledge:  dark contract acknowledge <id> --agent <agent-id>
  4. If a contract changes:  dark contract update <id> --content "..." --reason "..."
     (notifies all bound agents via mail)

Examples:
  $ dark contract list --run-id run_01XYZ
  $ dark contract show ctr_01ABC
  $ dark contract check ctr_01ABC --agent agt_01DEF   # check compliance
`)
  .addCommand(contractListCommand)
  .addCommand(contractShowCommand)
  .addCommand(contractUpdateCommand)
  .addCommand(contractAcknowledgeCommand)
  .addCommand(contractCheckCommand);
