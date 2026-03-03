import { Command } from "commander";
import { specCreateCommand } from "./create.js";
import { specShowCommand } from "./show.js";
import { specListCommand } from "./list.js";
import { specHistoryCommand } from "./history.js";
import { specArchiveCommand } from "./archive.js";

export const specCommand = new Command("spec")
  .description("Create and manage specifications — the input to every pipeline run")
  .addHelpText("after", `
A spec is a markdown document that describes what to build. It lives in
.df/specs/ and contains YAML frontmatter (id, title, status) plus free-form
content: goals, requirements, and holdout scenarios.

Specs go through statuses: draft → building → completed (or archived)

Once a spec has a completed build, it is immutable. Create a follow-up spec
to continue evolving the idea:

  $ dark spec create --from <spec-id> "Follow-up: <description>"
  $ dark spec history <spec-id>        # see the chain of spec evolution

Workflow:

  $ dark spec create "Add JWT auth"            # creates markdown template + DB record
  $ $EDITOR .df/specs/spec_01ABC123.md         # fill in requirements and scenarios
  $ dark build spec_01ABC123                   # run the pipeline
  $ dark spec create --from spec_01ABC123 "Refine auth"  # iterate on completed spec

The spec is the single source of truth for what the pipeline should produce.
Builders see the spec; evaluators see the holdout scenarios.
`)
  .addCommand(specCreateCommand)
  .addCommand(specShowCommand)
  .addCommand(specListCommand)
  .addCommand(specHistoryCommand)
  .addCommand(specArchiveCommand);
