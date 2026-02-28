# dark — Dark Factory CLI

<!-- token-count --><!-- /token-count -->

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Bun](https://img.shields.io/badge/Bun-000000?logo=bun&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?logo=sqlite&logoColor=white)
![Claude](https://img.shields.io/badge/Claude-powered-CC785C?logo=anthropic&logoColor=white)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A build orchestration system that decomposes software specifications into independently buildable modules, runs parallel LLM-powered builders in isolated worktrees, validates outputs against holdout scenarios, and merges results. Designed for AI agents that build software — not for humans writing code by hand.

## Install

Requires [Bun](https://bun.sh) and [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code).

```bash
git clone https://github.com/a1j9o94/df-cli.git
cd df-cli
bun install

# Link globally (pick one):
mkdir -p ~/.local/bin
ln -sf $(pwd)/bin/dark ~/.local/bin/dark   # add ~/.local/bin to your PATH
# — or —
alias dark="bun run $(pwd)/src/index.ts"   # shell alias
```

Verify: `dark --version` should print `0.1.0`.

## Quick Start

```bash
# Initialize a Dark Factory project
dark init --name my-project

# Create a specification (what to build)
dark spec create "Add user authentication with JWT"

# Edit the spec with your requirements and holdout scenarios
$EDITOR .df/specs/spec_01ABC123.md

# Run the full pipeline
dark build spec_01ABC123

# Watch progress
dark status
```

## How It Works

```
Human → Orchestrator → Architect → Builders (parallel) → Integration → Evaluation → Merge
```

The pipeline has 8 phases:

```
scout → architect → plan-review → build → integrate → evaluate-functional → evaluate-change → merge
```

1. **Scout** — index the codebase so agents understand the project
2. **Architect** — decompose the spec into modules with interface contracts and a dependency DAG
3. **Plan Review** — auto-approve small plans (≤4 modules), present large ones for human review
4. **Build** — spawn parallel builders, each in its own git worktree, bound by contracts
5. **Integrate** — merge worktrees, run checkpoint tests to verify modules compose correctly
6. **Evaluate (functional)** — run holdout scenarios the builders never saw
7. **Evaluate (change)** — test changeability: can a fresh builder make modifications easily?
8. **Merge** — integrate into the target branch with post-merge validation

If evaluation fails, the pipeline iterates (retries from the build phase) up to `max_iterations` times.

## Agent Roles

| Role | Lifespan | Codebase Access | Writes Code | Talks to Human |
|------|----------|----------------|-------------|----------------|
| Orchestrator | Session-persistent | None | No | Yes |
| Architect | 5-10 min | Read-only | Contracts only | No |
| Builder | 10-45 min | Read-write (worktree) | Yes | No |
| Integration-Tester | 5-10 min | Read-write | No | No |
| Evaluator | 5-20 min | Read-only | No | No |
| Merger | 1-5 min | Read-write (target) | No | No |

Each agent is a Claude Code CLI process spawned via `Bun.spawn`. They communicate through a SQLite-backed mail system — not direct process communication — making messages durable, inspectable, and debuggable.

## Core Concepts

### Specs
Markdown documents in `.df/specs/` with YAML frontmatter. Describe what to build: goals, requirements, and holdout scenarios. The single source of truth for every pipeline run.

### Buildplans
JSON artifacts produced by the Architect. Define modules (units of work), interface contracts (typed boundaries), dependency DAGs (build ordering), and integration test strategies.

### Interface Contracts
Type-level definitions (TypeScript interfaces, Python Protocols, etc.) that define boundaries between modules. Precise enough to type-check against. Builders implement to these contracts without coordinating with each other. If a builder needs a contract changed, they mail the architect.

### Holdout Scenarios
Test scenarios the Evaluator uses to validate builds. Builders never see these — they test what the human actually wants, not what the builder thought they wanted.

### Worktree Isolation
Each builder operates in its own git worktree. No shared mutable state between parallel builders. Integration happens after builds complete.

## CLI Reference

```bash
# Pipeline
dark init [--name <name>]
dark build <spec-id> [--mode quick|thorough] [--parallel <n>] [--budget-usd <amount>]
dark build <spec-id> --skip-architect           # single-module, no decomposition
dark status [--run-id <id>] [--json]
dark run list [--spec <id>] [--json]

# Specs
dark spec create <title>
dark spec show <spec-id> [--json]
dark spec list [--status <status>] [--json]

# Architecture
dark architect analyze <spec-id>                # spawn architect agent
dark architect submit-plan <agent-id> --plan <json>
dark architect get-plan <spec-id> [--json]
dark architect revise <spec-id> --feedback "<feedback>"

# Contracts
dark contract list [--run-id <id>] [--json]
dark contract show <contract-id> [--json]
dark contract update <id> --content <content> --reason "<reason>" --agent <agent-id>
dark contract acknowledge <id> --agent <agent-id>
dark contract check <id> --agent <agent-id>

# Integration
dark integrate run <run-id> [--phase <n>] [--json]
dark integrate status [--run-id <id>] [--json]

# Agents
dark agent list [--run-id <id>] [--role <role>] [--json]
dark agent heartbeat <agent-id>
dark agent complete <agent-id>
dark agent fail <agent-id> --error "<description>"

# Communication
dark mail send --from <id> --to <agent-id|@role|@contract:id> --body "<msg>" --run-id <id>
dark mail check --agent <agent-id> [--unread] [--mark-read] [--json]

# Resources
dark resource status
dark resource set <name> --capacity <n>

# Expertise
dark expertise prime [--paths <paths>]
dark expertise show [--json]
```

Run `dark <command> --help` for detailed help with examples on any command.

## Project Structure

```
.df/
├── config.yaml          # Project configuration (build mode, parallelism, budget, thresholds)
├── pipeline.yaml        # Pipeline phase definitions (gates, timeouts, skip conditions)
├── state.db             # SQLite state (runs, agents, builds, contracts, events, messages)
├── specs/               # Specification documents (markdown + YAML frontmatter)
├── expertise/           # Cached codebase index (file tree, line counts by extension)
├── scenarios/           # Holdout test scenarios (builders never see these)
├── worktrees/           # Isolated builder worktrees (gitignored)
├── buildplans/          # Architect buildplan artifacts
├── contracts/           # Interface contract definitions
└── logs/                # Agent logs (gitignored)
```

## Design Principles

- **Empirical over subjective.** Holdout scenarios measure quality, not LLM opinions about code.
- **Contracts over coordination.** Builders work independently against typed interfaces, not through conversation.
- **Fewer, fatter modules.** Coordination cost scales as N². Clean interfaces beat fine-grained parallelism.
- **DAG dependencies, no cycles.** If A depends on B and B depends on A, that's one module.
- **Budget-aware.** Every agent reports cost. The pipeline respects budgets and surfaces tradeoffs.

## Tech Stack

- **Runtime:** [Bun](https://bun.sh)
- **Language:** TypeScript (ES2022, strict)
- **State:** SQLite via `bun:sqlite` (WAL mode, foreign keys, 10 tables + 1 view)
- **CLI Framework:** Commander.js
- **Agent Runtime:** Claude Code CLI child processes via `Bun.spawn`
- **Isolation:** Git worktrees
- **IDs:** ULIDs (prefixed: `run_`, `agt_`, `spec_`, `plan_`, `ctr_`, `msg_`, `evt_`)
- **Linter:** Biome

## Architecture

```
src/
├── types/           10 files — all data shapes (no logic)
├── utils/            5 files — IDs, config loading, logger, formatting, frontmatter
├── db/              10 files — SQLite schema, singleton, 8 query modules
├── runtime/          4 files — AgentRuntime interface, ClaudeCodeRuntime, process mgmt, worktrees
├── pipeline/         7 files — engine, phases, scheduler (Kahn's), budget, validation, integration, evaluation
├── agents/           6 files — role definitions, 5 system prompt templates
├── commands/        37 files — Commander.js command tree (12 groups, 25+ subcommands)
└── index.ts              — entry point

tests/
├── unit/db/          9 files — schema + 8 query module tests
└── unit/pipeline/    4 files — scheduler, phases, budget, validation tests
```

100 tests, 235 assertions.

## Further Reading

- [ARCHITECT.md](./ARCHITECT.md) — full system design and agent coordination model
- [df-spec-addendum-architect.md](./df-spec-addendum-architect.md) — architect phase specification
