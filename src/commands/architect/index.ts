import { Command } from "commander";
import { architectAnalyzeCommand } from "./analyze.js";
import { architectSubmitPlanCommand } from "./submit-plan.js";
import { architectGetPlanCommand } from "./get-plan.js";
import { architectReviseCommand } from "./revise.js";

export const architectCommand = new Command("architect")
  .description("Decompose specs into modules, contracts, and dependency graphs")
  .addHelpText("after", `
The Architect agent reads a spec and produces a buildplan — a JSON document that
defines modules (units of work), contracts (interfaces between modules), and a
dependency DAG (which modules can build in parallel vs. sequentially).

The pipeline runs this automatically during "dark build", but you can also drive
it manually for inspection or iteration:

  $ dark architect analyze spec_01ABC         # spawn architect, get buildplan
  $ dark architect get-plan spec_01ABC        # view the active buildplan
  $ dark architect revise spec_01ABC \\
      --feedback "Split the parser into two modules"

When an architect submits a plan, it's validated (no cycles, valid module refs,
contracts have content) and the contracts are extracted into the DB. Builders
will later acknowledge these contracts before starting work.

Buildplan JSON structure:
  modules[]        — id, title, scope, complexity, token/time estimates
  contracts[]      — name, format, content, bound modules, binding roles
  dependencies[]   — from (depends on) → to, type (completion/contract/artifact)
  parallelism      — groups, critical path, max concurrency
  integration_strategy — checkpoints and final integration test
`)
  .addCommand(architectAnalyzeCommand)
  .addCommand(architectSubmitPlanCommand)
  .addCommand(architectGetPlanCommand)
  .addCommand(architectReviseCommand);
