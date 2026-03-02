---
id: spec_01KJNYN8BWYH2KWYNC9JNBDR9X
title: "Dashboard spec editor: create and edit specs directly from the dashboard UI"
type: feature
status: draft
version: 0.1.0
priority: medium
depends_on:
  - spec_01KJNFCE66DE8MM1SH5NQF0GG8
---

# Dashboard spec editor: create and edit specs directly from the dashboard UI

## Goal

PMs should be able to create and edit specs from the dashboard without opening a terminal. Type a plain description of what to build, refine it in a markdown editor, and hit "Build" to kick off the pipeline. The dashboard becomes self-service for spec creation — no CLI required for the common path.

## Problem

Today, creating a spec requires the terminal: `dark spec create`, then opening the generated file in an editor, then `dark build`. PMs who aren't terminal-native have to context-switch out of the dashboard to do the most fundamental action. This also means the dashboard is read-only — it shows build status but can't initiate builds.

## Requirements

### Module 1: Spec List Sidebar

- Replace the run-centric sidebar with a spec-centric view
- Show all specs grouped by status: building, draft, completed
- Each spec card shows: title, status badge, last modified date
- Clicking a spec shows its content in the main panel
- "New Spec" button in the sidebar header
- Completed specs show their most recent run's pass rate as a small indicator

### Module 2: Spec Creation Flow

- "New Spec" button opens a creation modal or panel
- Text input: PM types a plain-language description (like they would in a Slack message or GitHub issue)
- On submit, the system generates a spec file from the description:
  - Title extracted or inferred from the description
  - Goal section populated from the description text
  - Requirements section generated as a bullet list
  - Scenarios section left as placeholders for the architect to fill
  - Frontmatter with generated ID, `status: draft`, `type: feature`
- Spec file written to `.df/specs/` and registered in the database
- After generation, the spec opens in the inline editor for refinement

### Module 3: Inline Markdown Editor

- Main panel shows spec content in a split view: raw markdown on the left, rendered preview on the right
- Editable sections: title, goal, requirements, scenarios, frontmatter fields (priority, depends_on)
- Save button persists changes to the spec file on disk
- Auto-save on a debounce (3 seconds after last keystroke) with a "saved" indicator
- Syntax highlighting for markdown
- No external editor dependencies — the editor is part of the dashboard HTML (use a lightweight embedded editor like a `<textarea>` with preview, not a heavy library)

### Module 4: Build from Dashboard

- "Build" button visible on draft specs
- Clicking "Build" calls `POST /api/builds` with the spec ID
- Server-side: equivalent to running `dark build <spec-id>` — creates a run, starts the pipeline
- Dashboard transitions to the run view for the newly started build
- Button disabled on specs that are already building or completed
- Error state: if build fails to start, show the error inline (not a silent failure)

### Module 5: Immutability Guard

- Specs with at least one completed run (all scenarios passed) are read-only in the editor
- Visual indicator: "Locked" badge on completed specs
- Editor fields become non-editable for locked specs
- Explanation text: "This spec has a completed build. Create a new spec to make changes."
- Draft specs and specs with only failed runs remain editable

### API Endpoints

- `GET /api/specs` — list all specs with status, title, last modified
- `GET /api/specs/:id` — full spec content (markdown body + parsed frontmatter)
- `POST /api/specs` — create a new spec from a description string
- `PUT /api/specs/:id` — update spec content (markdown body)
- `POST /api/builds` — start a build for a spec ID (returns run ID)
- `GET /api/specs/:id/runs` — list runs for a spec

## Scenarios

### Functional

1. **Create spec from dashboard**: Click "New Spec", type "Add a caching layer for the API responses", submit. Verify a spec file is created in `.df/specs/` with a title, goal section, and requirements derived from the description.

2. **Edit draft spec**: Open an existing draft spec in the editor. Modify the requirements section. Click save. Verify the file on disk reflects the changes.

3. **Cannot edit completed spec**: Open a spec that has a completed build. Verify the editor fields are non-editable and a "Locked" badge is visible.

4. **Build from dashboard**: Open a draft spec, click "Build". Verify the pipeline starts, a run is created in the database, and the dashboard transitions to show the active run.

5. **Spec list shows all specs**: Create 3 specs (one draft, one building, one completed). Verify the sidebar shows all 3 grouped by status with correct badges.

6. **Build button disabled during active build**: Start a build on a spec. Verify the "Build" button becomes disabled while the run is active.

### Changeability

1. **Add spec templates**: Adding a "template" dropdown to the creation flow (e.g., "API endpoint", "UI component", "CLI command") should require adding a template map and a select element — no changes to the spec generation or editor logic.

2. **Swap editor implementation**: Replacing the textarea-based editor with a richer editor (e.g., CodeMirror) should only require changing the editor component — the save/load API contract stays the same.
