---
id: spec_01KJNWDZAYJ8CFGPA796S5YTPY
title: "Spec dependency graph and swarm execution"
type: feature
status: draft
version: 0.1.0
priority: high
depends_on:
  - spec_01KJNT36W1185G5KPW63YAGWBR
---

# Spec Dependency Graph and Swarm Execution

## Goal

Allow specs to declare dependencies on other specs, forming a DAG. When `dark swarm` runs, it automatically builds specs in dependency order — completing one, then moving to the next unblocked spec. This turns dark from "build one spec at a time" into "give it a roadmap and walk away."

## Problem

Today each `dark build` is independent. If the architect research spec depends on design artifacts being built first, a human has to manually sequence them. There's no way to say "build A, then B, then C" and have the system figure out the order, parallelize where possible, and continue autonomously.

## Requirements

### Module 1: Spec Dependencies in Frontmatter
- Add optional `depends_on: [spec_id, ...]` field to spec YAML frontmatter
- `dark spec create --depends-on <spec-id>` sets the dependency at creation
- `dark spec add-dep <spec-id> --on <dependency-spec-id>` adds a dependency after creation
- `dark spec remove-dep <spec-id> --on <dependency-spec-id>` removes one
- `dark spec deps <spec-id>` shows the dependency tree for a spec
- Cycle detection: reject if adding a dependency would create a cycle

### Module 2: Spec DAG Queries
- `dark spec ready` — list specs that have no unmet dependencies (all deps are completed). Like `bd ready` in beads.
- `dark spec blocked` — list specs waiting on dependencies
- `dark spec dag [--json]` — show the full dependency graph (ASCII or JSON)
- DB table or view: `spec_dependencies (spec_id, depends_on_spec_id)`
- Query: "which specs are buildable right now?" = specs where all `depends_on` specs have status `completed`

### Module 3: `dark swarm` Command
- `dark swarm [--budget-usd <total>] [--parallel <n>]` — continuously build all ready specs
- Algorithm:
  1. Find all ready specs (no unmet deps, status = `draft` or `ready`)
  2. Start up to `--parallel` builds simultaneously
  3. When a build completes, check for newly unblocked specs
  4. Start the next batch
  5. Repeat until no more specs are ready or budget exhausted
- `dark swarm --dry-run` — show what would be built and in what order, without actually building
- Budget applies across ALL runs in the swarm, not per-spec
- `ctrl-C` gracefully pauses all active runs (uses `dark pause` if available)

### Module 4: `dark roadmap` Command
- `dark roadmap [--json]` — show all specs organized by dependency layers
- Layer 0: no dependencies (can build immediately)
- Layer 1: depends only on layer 0 specs
- Layer N: depends on layer N-1 or earlier
- Shows status of each spec (draft, building, completed)
- Estimated total cost and time based on architect estimates
- This is the PM view: "here's our backlog as a dependency-ordered roadmap"

## Contracts

- `SpecDependency`: `{ specId: string, dependsOnSpecId: string }`
- `getReadySpecs(db): SpecRecord[]` — specs with all dependencies completed
- `getBlockedSpecs(db): Array<{ spec: SpecRecord, blockedBy: string[] }>` — specs waiting
- `getSpecLayers(db): Array<{ layer: number, specs: SpecRecord[] }>` — DAG topological layers

## Scenarios

### Functional

1. **Add dependency**: Create spec A and spec B. `dark spec add-dep B --on A`. Verify B shows in `dark spec blocked` and A shows in `dark spec ready`.

2. **Build unblocks dependent**: Build spec A to completion. Verify spec B moves from `dark spec blocked` to `dark spec ready`.

3. **Cycle detection**: Create A depends on B, B depends on C. Try to add C depends on A. Verify it's rejected with a cycle error.

4. **Swarm execution**: Create specs A (no deps), B (depends on A), C (depends on A), D (depends on B and C). Run `dark swarm`. Verify: A builds first, then B and C in parallel, then D after both complete.

5. **Swarm budget**: Run `dark swarm --budget-usd 5` with 3 ready specs. Verify it stops when cumulative cost exceeds $5 even if specs remain.

6. **Swarm dry run**: `dark swarm --dry-run` shows the execution plan without building anything. Verify order matches the DAG.

7. **Roadmap view**: `dark roadmap` with 5 specs at different dependency layers. Verify output shows specs grouped by layer with status indicators.

8. **Spec ready**: With a mix of completed and draft specs with dependencies, `dark spec ready` only returns specs whose deps are all completed.

### Changeability

1. **Add priority ordering within layers**: Within the same dependency layer, specs could be ordered by priority field. Should only require a sort in `getReadySpecs`, no DAG changes.
