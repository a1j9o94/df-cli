---
id: spec_01KJNFCE66DE8MM1SH5NQF0GG8
title: Redesign dashboard around the workplan — not agent details
type: feature
status: draft
version: 0.1.0
priority: high
---

# Redesign dashboard around the workplan

## Goal

The current dashboard is agent-centric: it shows `architect-1772394582557` with a status badge and token count. A PM looking at this can't answer: "What's being built? What decisions were made? What's the architecture?"

The dashboard should be workplan-centric. The primary view should show:
- What the spec asked for (the goal, in human words)
- How the architect decomposed it (modules, contracts, dependencies)
- Which modules are done, which are in progress, which are blocked
- What the evaluator found (holdout results, discovered edge cases)
- Decisions and tradeoffs (from the buildplan risks and integration strategy)

Agent details (PIDs, heartbeats, token counts) should be secondary — available in a collapsible panel, not the default view.

## Current Problems

1. **Spec IDs instead of titles**: Shows `spec_01KJNEMDNEKG3...` instead of "Require holdout scenarios before build"
2. **Agent names are timestamps**: `architect-1772394582557` means nothing
3. **No workplan visibility**: The buildplan (modules, contracts, dependency graph) is never shown
4. **No spec context**: The user can't see what the build is FOR without leaving the dashboard
5. **Run IDs are cryptic**: `run_01KJNF64GVR4...` should show the spec title

## Requirements

### API changes (`src/dashboard/server.ts`)

#### Enrich run list with spec titles
- `GET /api/runs` should include `specTitle` from the specs table (JOIN or subquery)
- `GET /api/runs/:id` same

#### Add buildplan endpoint data
- `GET /api/runs/:id/buildplan` already exists — ensure it returns module descriptions, contract content, dependency edges, and risk assessments

#### Add spec content endpoint
- `GET /api/runs/:id/spec` — return the spec's markdown content (read from file_path)

### UI redesign (`src/dashboard/index.ts`)

#### Sidebar: Show spec titles, not IDs
- Run cards should show the spec TITLE as the primary text
- Show phase as a small label below the title
- Show a mini progress indicator (e.g. "2/3 modules built")
- Run ID and spec ID become hover tooltips or small monospace text, not the headline

#### Main panel: Three tabs (replacing Agents/Modules)

**Tab 1: Overview (default)**
- Spec goal (first paragraph from the spec file)
- Phase pipeline bar: 8 phases as a horizontal stepper, current phase highlighted
- Key stats row: elapsed, cost, modules built, scenarios passed
- Architecture summary: if buildplan exists, show module names with one-line descriptions and a simple dependency visualization (e.g. `data-layer → code-gen → http-api` as a horizontal flow)
- Risks: from buildplan, if any

**Tab 2: Modules**
- Card per module (existing, but improved)
- Show module TITLE and DESCRIPTION, not just ID
- Show which files it creates/modifies (from scope)
- Show contract compliance (acknowledged/total)
- Show dependency status (what it's waiting on, what depends on it)
- Builder agent info collapsed by default — expand to see PID, cost, tokens, TDD phase

**Tab 3: Validation**
- Holdout scenarios: list with pass/fail from evaluator
- New scenarios discovered by evaluator (show which ones were added during this run)
- Integration test results
- If evaluation failed: show the failing scenario details prominently

#### Agent details: Collapsible at bottom
- Small "Agents" section at the bottom of the overview tab
- Shows role, status, elapsed time
- Expandable to show full details (PID, cost, tokens, error, worktree path)
- NOT the primary view

### Human-readable names

Replace cryptic names throughout:
- Agent names: show role + module (e.g. "Builder: data-layer" not "builder-mod_data_layer")
- Phase names: show friendly names (e.g. "Evaluating" not "evaluate-functional")
- Timestamps: show relative time ("3m ago" not "2026-03-01T19:02:20Z")

## Scenarios

### Functional

1. **Spec title visible**: Open dashboard. Verify run cards show spec titles, not spec IDs.
2. **Overview tab shows architecture**: Select a completed run with a buildplan. Verify the overview shows module names, descriptions, and a dependency flow.
3. **Validation tab shows scenarios**: Select a run that passed evaluation. Verify holdout scenarios are listed with pass/fail indicators.
4. **Agent details collapsed**: On the overview tab, verify agent details are NOT shown by default. Click to expand. Verify PID, cost, tokens appear.
5. **Phase stepper**: Verify the horizontal phase bar shows all 8 phases with the current one highlighted differently than completed and pending.
6. **Human-readable names**: Verify no raw ULIDs, timestamps-as-names, or snake_case IDs in the default view.

### Changeability

1. **Add a new tab**: Adding a "Timeline" tab should require adding a tab button, a panel div, a render function, and a fetch call — same pattern as the existing tabs.
