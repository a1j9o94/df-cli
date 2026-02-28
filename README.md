# df — Dark Factory CLI

A build orchestration system that decomposes software specifications into independently buildable modules, runs parallel LLM-powered builders in isolated worktrees, validates outputs against holdout scenarios, and merges results. Designed for AI agents that build software — not for humans writing code by hand.

## How It Works

```
Human → Orchestrator → Architect → Builders (parallel) → Integration → Evaluation → Merge
```

1. **Human** sets goals, reviews specs, approves plans
2. **Orchestrator** manages the pipeline, translates goals into specs, makes routing decisions
3. **Architect** reads the codebase, decomposes specs into modules with interface contracts and dependency DAGs
4. **Builders** implement modules in isolated git worktrees following TDD cycles, bound by contracts
5. **Integration-Tester** composes parallel builder outputs and validates they work together
6. **Evaluator** runs holdout scenarios (functional + changeability) against integrated code
7. **Merger** integrates into the target branch with post-merge validation

## Agent Roles

| Role | Lifespan | Codebase Access | Writes Code | Talks to Human |
|------|----------|----------------|-------------|----------------|
| Orchestrator | Session-persistent | None | No | Yes |
| Architect | 5-10 min | Read-only | Contracts only | No |
| Builder | 10-45 min | Read-write (worktree) | Yes | No |
| Evaluator | 5-20 min | Read-only | No | No |
| Merger | 1-5 min | Read-write (target) | No | No |

## Core Concepts

### Specs
Markdown documents in `.df/specs/` that describe what to build. The Orchestrator produces these from human goals.

### Buildplans
JSON artifacts produced by the Architect. Define modules, interface contracts, dependency ordering, and integration test strategies. The Orchestrator uses these to spawn and coordinate builders.

### Interface Contracts
Type-level definitions (TypeScript interfaces, Python Protocols, etc.) that define boundaries between modules. Precise enough to type-check against. Builders implement to these contracts without needing to coordinate with each other.

### Holdout Scenarios
Test scenarios the Evaluator uses to validate builds. Builders never see these — they test what the human actually wants, not what the builder thought they wanted.

### Worktree Isolation
Each builder operates in its own git worktree. No shared mutable state between parallel builders. Integration happens after builds complete.

## CLI Overview

```bash
# Pipeline
df build <spec-id> [--mode quick|thorough] [--parallel <n>] [--budget-usd <amount>]
df status [--run-id <id>] [--json]
df run list [--spec <id>]

# Specs
df spec create <title> [--from-template <name>]
df spec show <spec-id>
df spec list

# Architecture
df architect analyze <spec-id>
df architect get-plan <spec-id>
df architect revise <spec-id> --feedback "<feedback>"

# Contracts
df contract list [--spec <spec-id>]
df contract show <contract-id>
df contract update <contract-id> --content <content> --reason "<reason>"
df contract check <contract-id> --agent <agent-id>

# Integration
df integrate <run-id> [--phase <n>]
df integrate status

# Agents
df agent list [--run-id <id>]
df agent heartbeat <agent-id>
df agent complete <agent-id>
df agent fail <agent-id> --error "<description>"

# Communication
df mail send --to <agent-id|@role|@contract:id> --body "<message>"
df mail check [--agent <agent-id>]

# Resources
df resource status [--json]
df resource set <resource-id> --capacity <n>

# Expertise
df expertise prime [--paths <paths>]
df expertise show
```

## Project Structure

```
.df/
├── config.yaml          # Project configuration
├── state.db             # SQLite state (runs, agents, builds, contracts)
├── specs/               # Spec documents
├── expertise/           # Cached codebase knowledge
├── scenarios/           # Holdout test scenarios
├── worktrees/           # Isolated builder worktrees
├── buildplans/          # Architect buildplan artifacts
├── contracts/           # Interface contract definitions
├── logs/                # Agent logs and heartbeats
└── pipeline.yaml        # Pipeline phase definitions
```

## Getting Started

```bash
# Initialize a project
df init

# Create a spec from a goal
df spec create "Add user authentication with JWT"

# Run the full pipeline
df build <spec-id>

# Check status
df status
```

## Design Principles

- **Empirical over subjective.** Holdout scenarios measure quality, not LLM opinions about code.
- **Contracts over coordination.** Builders work independently against typed interfaces, not through conversation.
- **Fewer, fatter modules.** Coordination cost scales as N². Clean interfaces beat fine-grained parallelism.
- **DAG dependencies, no cycles.** If A depends on B and B depends on A, that's one module.
- **Budget-aware.** Every agent reports cost. The pipeline respects budgets and surfaces tradeoffs.

## Tech Stack

- **Language:** TypeScript (Node.js)
- **State:** SQLite via better-sqlite3
- **CLI Framework:** Commander.js
- **Agent Runtime:** Claude Code subprocesses (tmux-managed)
- **Isolation:** Git worktrees
- **IDs:** ULIDs

## Status

Under active development. See [ARCHITECT.md](./ARCHITECT.md) and [df-spec-addendum-architect.md](./df-spec-addendum-architect.md) for the full system design.
