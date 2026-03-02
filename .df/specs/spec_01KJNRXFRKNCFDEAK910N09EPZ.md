---
id: spec_01KJNRXFRKNCFDEAK910N09EPZ
title: "Multi-repo workspace: coordinate builds across frontend/backend repositories"
type: feature
status: draft
version: 0.1.0
priority: high
depends_on:
  - spec_01KJNWDZAYJ8CFGPA796S5YTPY
  - spec_01KJNFCE66DE8MM1SH5NQF0GG8
---

# Multi-repo Workspace

## Goal

Enable dark to coordinate builds across multiple repositories under a single workspace. A user with `frontend/` and `backend/` directories (each their own git repo) should be able to write a single spec that spans both, with scenarios that validate cross-repo integration (e.g. "backend API change doesn't break frontend rendering").

## Problem

Today dark assumes one `.df/` per git repo. Real projects often have:
- Monorepos with multiple packages (`packages/api`, `packages/web`, `packages/shared`)
- Separate repos co-located in a workspace (`~/projects/myapp/frontend`, `~/projects/myapp/backend`)
- Micro-frontend architectures with independent deploy units that share contracts

The architect can only decompose within one repo. Scenarios can only test one codebase. Builders only get worktrees from one repo's git history.

## Requirements

### Module 1: Workspace Configuration
- `dark workspace init` — creates a `.df-workspace/` in the parent directory
- `.df-workspace/config.yaml` — lists member projects with paths and roles:
  ```yaml
  projects:
    - name: backend
      path: ./backend
      role: api-provider
    - name: frontend
      path: ./frontend
      role: api-consumer
  ```
- Each member project keeps its own `.df/` for standalone builds
- Workspace-level specs live in `.df-workspace/specs/`
- Workspace-level scenarios live in `.df-workspace/scenarios/`
- Workspace state DB at `.df-workspace/state.db` tracks cross-project runs

### Module 2: Cross-repo Specs and Buildplans
- Workspace specs can reference multiple projects by name
- Modules in the buildplan are tagged with `targetProject: string`
- Builders for project A get worktrees from project A's repo
- Builders for project B get worktrees from project B's repo
- Contracts can span projects (e.g. "API contract between backend and frontend")
- The architect sees all projects' codebases when decomposing

### Module 3: Cross-repo Scenarios and Evaluation
- Scenarios can declare `projects: [backend, frontend]`
- The evaluator gets access to ALL projects in the scenario's project list
- Integration scenarios can start both services and test end-to-end
- A backend contract change triggers re-evaluation of frontend scenarios that depend on it

### Module 4: Dependency-aware Triggering
- When `dark build` runs on a workspace spec, it detects which projects are affected
- Backend contract changes trigger frontend evaluation (not full rebuild)
- `dark status` at workspace level shows cross-project run status
- Shared contracts (OpenAPI, GraphQL SDL, TypeScript interfaces) are first-class artifacts

### Module 5: Dashboard Hierarchy
`dark dash` should render differently depending on where it's invoked:

**Global level** (no `.df/` or `.df-workspace/` found):
- Scan `~/.dark/registry.yaml` (auto-populated when `dark init` or `dark workspace init` runs) for all known projects and workspaces on this machine
- Show a grid of projects/workspaces with name, path, last run status, last run date
- Click into any project to see its project-level dashboard
- Show aggregate stats: total runs, total cost, active agents across all projects

**Workspace level** (`.df-workspace/` found):
- Show all member projects in a grid with their individual run status
- Show workspace-level runs (cross-repo specs) with which projects are involved
- Shared contract status: which contracts are satisfied, which have pending changes
- Dependency graph visualization: which projects depend on which
- Click into any member project for its project-level view

**Project level** (`.df/` found, no workspace):
- Current behavior: runs, agents, phases, buildplan, scenarios, cost
- **Roadmap tab**: spec dependency graph as the primary project planning view (see below)

The dashboard URL scheme: `/` = current level, `/project/<name>` = drill into project, `/workspace/<name>` = drill into workspace.

### Module 7: Roadmap Visualization in Dashboard
The dashboard needs a view that answers "what's the plan, what's done, what's next?" — not at the agent/phase level, but at the spec/feature level.

**Layout**: Horizontal flow chart. Specs are cards arranged left-to-right by dependency layer. Dependency arrows connect them. Multiple specs in the same layer are stacked vertically (they can build in parallel).

**Spec cards show**:
- Title (truncated)
- Status badge: draft (gray), building (pulsing blue), completed (green), failed (red), blocked (amber with lock icon)
- If building: progress bar showing phase (e.g. "build 2/3 modules")
- If blocked: "Waiting on: Spec A, Spec B" with links
- Cost so far / estimated total
- Click to expand: full spec title, module list, agent timeline, evaluation results

**Interactions**:
- Hover a spec to highlight its dependencies (upstream) and dependents (downstream)
- Click a completed spec to see its run summary inline
- Click a blocked spec to see what's blocking it and jump to the blocker
- "Start next" button on ready specs that aren't building yet

**Live updates**: When a spec completes, its card turns green and any newly-unblocked dependents animate from amber to gray (ready). If `dark swarm` is running, newly-ready specs auto-start and their cards pulse blue.

This replaces kanban because the structure IS the board — dependencies define the columns, not arbitrary stages. A PM sees the whole plan as a graph, not a list.

### Module 6: Project Registry
- `~/.dark/registry.yaml` — auto-populated list of all dark projects and workspaces
- Updated on `dark init`, `dark workspace init`
- `dark projects list` — show all registered projects
- `dark projects prune` — remove entries for projects that no longer exist on disk
- Registry enables the global dashboard to find projects without scanning the entire filesystem

## Contracts

- `WorkspaceConfig`: `{ projects: ProjectRef[], sharedContracts: ContractRef[] }`
- `ProjectRef`: `{ name: string, path: string, role: string, dfDir: string }`
- `CrossRepoModule`: extends `ModuleDefinition` with `targetProject: string`
- `CrossRepoScenario`: extends scenario frontmatter with `projects: string[]`

## Scenarios

### Functional

1. **Init workspace**: `dark workspace init` in a directory with `frontend/` and `backend/` subdirectories (each a git repo). Verify `.df-workspace/` is created with both projects listed.

2. **Cross-repo spec build**: Create a workspace spec that adds an API endpoint (backend) and a UI component that calls it (frontend). Run `dark build`. Verify the architect creates modules tagged to different projects, builders get worktrees from the correct repo.

3. **Cross-repo scenario evaluation**: Write a scenario that starts the backend server and verifies the frontend can call it. Run the evaluator. Verify it has access to both project directories.

4. **Backend change triggers frontend eval**: Modify a backend API contract. Verify that frontend scenarios depending on that contract are re-evaluated without rebuilding the frontend.

5. **Standalone builds still work**: `cd backend && dark build` works independently using `backend/.df/` without the workspace.

6. **Global dashboard shows all projects**: Run `dark dash` from home directory. Verify it lists all registered projects and workspaces with their last run status.

7. **Workspace dashboard shows member projects**: Run `dark dash` from workspace root. Verify it shows all member projects in a grid, workspace-level runs, and shared contract status.

8. **Dashboard drill-down**: From workspace dashboard, click into a member project. Verify it shows the project-level view with runs, agents, phases. Navigate back to workspace level.

9. **Registry auto-populates**: Run `dark init` in a new directory. Verify `~/.dark/registry.yaml` is updated with the new project path.

10. **Roadmap visualization**: Project has 5 specs with dependencies forming a diamond (A → B, A → C, B → D, C → D). A is completed, B is building, C is blocked on A (bug — should be ready), D is blocked on B+C. Open dashboard roadmap tab. Verify specs are arranged in 3 layers (A | B,C | D), arrows connect them, status badges are correct, hovering B highlights A upstream and D downstream.

### Changeability

1. **Add a third project**: Adding a `shared/` library project to the workspace should require only updating `config.yaml` and running `dark init` inside it. No changes to the workspace engine code.
