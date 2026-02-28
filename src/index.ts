#!/usr/bin/env node
import { program } from "commander";

import { initCommand } from "./commands/init.js";
import { buildCommand } from "./commands/build.js";
import { statusCommand } from "./commands/status.js";
import { runCommand } from "./commands/run/index.js";
import { specCommand } from "./commands/spec/index.js";
import { architectCommand } from "./commands/architect/index.js";
import { contractCommand } from "./commands/contract/index.js";
import { integrateCommand } from "./commands/integrate/index.js";
import { agentCommand } from "./commands/agent/index.js";
import { mailCommand } from "./commands/mail/index.js";
import { resourceCommand } from "./commands/resource/index.js";
import { expertiseCommand } from "./commands/expertise/index.js";

program
  .name("df")
  .description("Dark Factory CLI — AI agent orchestration pipeline")
  .version("0.1.0");

program.addCommand(initCommand);
program.addCommand(buildCommand);
program.addCommand(statusCommand);
program.addCommand(runCommand);
program.addCommand(specCommand);
program.addCommand(architectCommand);
program.addCommand(contractCommand);
program.addCommand(integrateCommand);
program.addCommand(agentCommand);
program.addCommand(mailCommand);
program.addCommand(resourceCommand);
program.addCommand(expertiseCommand);

program.parse();
