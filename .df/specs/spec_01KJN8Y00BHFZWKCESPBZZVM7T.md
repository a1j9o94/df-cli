---
id: spec_01KJN8Y00BHFZWKCESPBZZVM7T
title: "Implement dark dash: localhost dashboard for pipeline visibility"
type: feature
status: draft
version: 0.1.0
priority: medium
---

# Implement `dark dash`

## Goal

`dark dash` starts a localhost web server that gives product managers and engineering leads real-time visibility into pipeline runs. It reads from the existing SQLite state DB (`.df/state.db`) and renders a single-page dashboard. No build step, no bundler — serve a single HTML file with inline CSS/JS that polls a JSON API.

## Audience

A product manager or engineering lead who wants to know:
- What's the current state of the build? Which phase are we in?
- How many modules were decomposed? Which are done, which are in progress?
- What did the evaluator find? Did holdout scenarios pass?
- How much did this cost? Are we within budget?
- What's the timeline? How long has each phase taken?
- Can I see the architect's plan? The contracts?

They should NOT need to run CLI commands or read SQLite directly.

## Requirements

### Module 1: HTTP API Server (`src/dashboard/server.ts`)
- `dark dash [--port <n>]` starts a Bun HTTP server (default port 3141)
- Serves a single HTML page at `/`
- JSON API endpoints that read from `.df/state.db`:
  - `GET /api/runs` — list all runs with status, phase, cost, timing
  - `GET /api/runs/:id` — single run detail with all phases and their events
  - `GET /api/runs/:id/agents` — agents for a run with role, status, cost, timing
  - `GET /api/runs/:id/buildplan` — the architect's buildplan (modules, contracts, dependencies)
  - `GET /api/runs/:id/events` — event timeline
  - `GET /api/runs/:id/scenarios` — holdout scenarios and evaluation results
  - `GET /api/runs/:id/modules` — per-module build status (uses parallel_build_progress view)
- All API endpoints return JSON
- Server reads DB path from `findDfDir()`
- CORS headers for local development

### Module 2: Dashboard UI (`src/dashboard/ui.ts`)
- Single HTML page served as a template string (no external files)
- Inline CSS using a dark theme (dark factory aesthetic)
- Auto-polls `/api/runs/:id` every 3 seconds while a run is active
- Layout sections:

**Header**: Project name, current run status badge (running/completed/failed), elapsed time, cost

**Pipeline Phase Bar**: Horizontal bar showing all 8 phases. Completed = green, current = pulsing blue, pending = gray, failed = red, skipped = dimmed. Click a phase to see its details below.

**Module Grid**: Card per module from buildplan. Each card shows:
  - Module name and description
  - Builder status (pending/running/completed/failed)
  - TDD phase indicator (red/green/refactor)
  - Files changed count
  - Cost and token usage
  - Contract compliance (acknowledged/total)

**Agent Timeline**: Vertical timeline showing agent lifecycle events — spawned, heartbeat, completed, failed. Color-coded by role. Shows PID, elapsed time, cost.

**Evaluation Results**: Table of holdout scenarios with pass/fail, score, and any new scenarios the evaluator created.

**Cost & Budget**: Progress bar showing spent vs budget. Projected total cost based on completed agents.

**Buildplan Details** (collapsible): Module dependency DAG (ASCII or simple SVG), contracts list with content, risk assessment.

### Module 3: Dashboard Command (`src/commands/dash.ts`)
- Wire into Commander.js CLI
- `dark dash` — start server, open browser, print URL
- `dark dash --port 8080` — custom port
- `dark dash --no-open` — don't open browser
- Register in `src/index.ts`
- Graceful shutdown on ctrl-C

## Contracts

- `DashboardAPI`: All `/api/*` endpoints return consistent JSON shapes
- `RunSummary`: `{ id, specId, status, phase, cost, budget, elapsed, moduleCount, completedCount }`
- `AgentSummary`: `{ id, role, name, status, pid, cost, tokens, elapsed, moduleId? }`
- `ModuleStatus`: `{ id, title, agentStatus, tddPhase, filesChanged, contractsAcknowledged }`

## Scenarios

### Functional

1. **Dashboard loads**: `dark dash` starts, browser opens to localhost:3141, page renders with project name and run list.

2. **Live run tracking**: Start `dark build` in another terminal, open dashboard. Verify the phase bar updates in real-time as phases advance. Verify module cards appear after architect phase.

3. **Completed run review**: View a completed run. Verify all phases show green. Verify evaluation results show scenario pass/fail. Verify cost matches agent totals.

4. **Failed run diagnosis**: View a failed run. Verify the failed phase is red. Verify the agent error message is visible. Verify the "last successful phase" is clear.

5. **API returns valid JSON**: Hit each `/api/*` endpoint directly. Verify well-formed JSON with correct fields.

6. **No runs exist**: Dashboard shows empty state with helpful message ("No pipeline runs yet. Run: dark build <spec-id>").

### Changeability

1. **Add new API endpoint**: Adding `/api/runs/:id/messages` should require only adding a new route handler and query function, no UI changes needed (API is consumed by fetch calls in the HTML template).
