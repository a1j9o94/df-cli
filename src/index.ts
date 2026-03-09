#!/usr/bin/env node
import { program } from "commander";

import { initCommand } from "./commands/init.js";
import { buildCommand } from "./commands/build.js";
import { continueCommand } from "./commands/continue.js";
import { pauseCommand } from "./commands/pause.js";
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
import { scenarioCommand } from "./commands/scenario/index.js";
import { researchCommand } from "./commands/research/index.js";
import { dashCommand } from "./commands/dash.js";
import { blockersCommand } from "./commands/blockers.js";
import { secretsCommand } from "./commands/secrets.js";
import { workspaceCommand } from "./commands/workspace/index.js";
import { projectsCommand } from "./commands/projects/index.js";

program
  .name("dark")
  .description("Dark Factory CLI — AI agent orchestration pipeline")
  .version("0.1.0")
  .addHelpText("before", `
Dark Factory decomposes software specs into independently buildable modules,
runs parallel LLM-powered builders in isolated git worktrees, validates outputs
against holdout scenarios, and merges results.

Pipeline phases:  scout → architect → plan-review → build → integrate → evaluate → merge

Typical workflow:

  $ dark init                         # Set up project (.df/ directory, config, DB)
  $ dark spec create "Add JWT auth"   # Create a specification document
  $ dark build <spec-id>              # Run the full pipeline end-to-end
  $ dark status                       # Watch progress, costs, agent status

How it works:

  1. You write a spec (a markdown document describing what to build)
  2. An Architect agent decomposes it into modules with interface contracts
  3. Builder agents implement modules in parallel (each in its own git worktree)
  4. An Integration-Tester verifies the modules work together
  5. An Evaluator validates against holdout scenarios you never showed the builders
  6. A Merger integrates everything into your target branch

Each agent is a Claude Code CLI process. They communicate through a SQLite-backed
mail system. The orchestrator manages their lifecycle, budget, and phase gates.
`)
  .addHelpText("after", `
Command groups:

  Workflow        init, build, continue, pause, status, run, dash — project setup and pipeline execution
  Specs           spec create/show/list — define what to build
  Architecture    architect, contract — decomposition and interface contracts
  Scenarios       scenario create/list — holdout test scenarios (created by architect)
  Testing         integrate — verify modules compose correctly
  Agents          agent, mail — lifecycle management and inter-agent messaging
  Research        research add/list/show — save and share findings across agents
  Infrastructure  resource, expertise — capacity limits and codebase indexing

Examples:

  $ dark init --name my-project
  $ dark spec create "Add user authentication"
  $ dark build spec_01ABC123 --skip-change-eval --budget-usd 10
  $ dark build spec_01ABC123 --skip-architect   # single-module, no decomposition
  $ dark status --run-id run_01XYZ --json
  $ dark architect analyze spec_01ABC123
  $ dark architect get-plan spec_01ABC123
  $ dark contract list --run-id run_01XYZ
  $ dark agent list --role builder
  $ dark mail check --agent agt_01DEF --unread
  $ dark resource set worktrees --capacity 8
  $ dark expertise prime --paths src,lib
`);

program.addCommand(initCommand);
program.addCommand(buildCommand);
program.addCommand(continueCommand);
program.addCommand(pauseCommand);
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
program.addCommand(scenarioCommand);
program.addCommand(researchCommand);
program.addCommand(dashCommand);
program.addCommand(blockersCommand);
program.addCommand(secretsCommand);
program.addCommand(workspaceCommand);
program.addCommand(projectsCommand);

program.parse();
