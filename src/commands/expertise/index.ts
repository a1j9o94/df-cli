import { Command } from "commander";
import { expertisePrimeCommand } from "./prime.js";
import { expertiseShowCommand } from "./show.js";

export const expertiseCommand = new Command("expertise")
  .description("Index the codebase so agents understand the project structure")
  .addHelpText("after", `
Before agents can work effectively, they need to understand the codebase.
"dark expertise prime" walks the source tree and generates a file index and
summary statistics (file count, line count by extension) in .df/expertise/.

This is used during the scout phase to give agents initial context about the
project they're working in. You can also run it manually to see what agents
will see.

  $ dark expertise prime                       # index from project root
  $ dark expertise prime --paths src,lib       # index specific directories
  $ dark expertise show                        # display the cached index
  $ dark expertise show --json                 # full file list as JSON
`)
  .addCommand(expertisePrimeCommand)
  .addCommand(expertiseShowCommand);
