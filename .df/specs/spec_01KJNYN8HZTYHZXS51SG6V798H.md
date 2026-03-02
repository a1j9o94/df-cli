---
id: spec_01KJNYN8HZTYHZXS51SG6V798H
title: "Executive timeline: CPO-level view of what shipped, what is in progress,
  and what is planned"
type: feature
status: draft
version: 0.1.0
priority: medium
depends_on:
  - spec_01KJNWDZAYJ8CFGPA796S5YTPY
  - spec_01KJNFCE66DE8MM1SH5NQF0GG8
---

# Executive timeline: CPO-level view of what shipped, what is in progress, and what is planned

## Goal

A dashboard tab designed for a CPO or VP Engineering to review project status. Not agent details, not code diffs — feature-level progress. "What shipped this week? What's in progress? What's the roadmap?" This is the artifact you'd share in a weekly leadership standup or paste into a Slack channel for stakeholder visibility.

## Problem

The current dashboard is built for the person running builds — agent details, token counts, scenario results. A leadership stakeholder looking at it can't quickly answer: "What have we shipped? What's next? Are we on track?" They'd need to mentally parse run IDs, agent statuses, and cost numbers into a feature narrative. There's no roll-up view.

## Requirements

### Module 1: Timeline Tab in Dashboard

- New "Timeline" tab alongside the existing Overview, Modules, and Validation tabs
- Tab is accessible from any run view and also from a top-level dashboard route (`/timeline`)
- The timeline is project-wide — it shows ALL specs across ALL runs, not scoped to a single run

### Module 2: Timeline Content Sections

**Summary Stats Bar (top)**
- Specs completed this month (count)
- Total cost this month (sum of all run costs)
- Average scenario pass rate across completed specs
- Specs in progress (count)

**This Week Section**
- Lists specs completed in the current calendar week (Mon-Sun)
- Each entry: spec title, completion date (relative: "2 days ago"), cost, scenario pass rate (e.g. "8/8")
- Sorted by completion date, most recent first

**Last Week Section**
- Same format as This Week, for the previous calendar week

**Earlier Section**
- Completed specs older than 2 weeks, grouped by month
- Collapsed by default — click to expand

**In Progress Section**
- Specs currently building
- Each entry: spec title, current phase (e.g. "Building module 3/5"), elapsed time, cost so far
- If available: estimated time remaining (from architect estimate vs. actual pace)

**Planned Section**
- Draft specs from the backlog, ordered by dependency layer (from the spec DAG)
- Layer 0 specs (no dependencies) shown first, then layer 1, etc.
- Each entry: spec title, dependency count, estimated cost (if architect has run)
- Visual indicator of which layer each spec is in

### Module 3: API Endpoint

- `GET /api/timeline` — returns structured timeline data:
  ```json
  {
    "summary": { "completedThisMonth": 5, "totalCostThisMonth": 42.50, "avgPassRate": 0.95, "inProgressCount": 2 },
    "thisWeek": [ { "specTitle": "...", "completedAt": "...", "cost": 8.50, "passRate": "8/8" } ],
    "lastWeek": [ ... ],
    "earlier": [ ... ],
    "inProgress": [ { "specTitle": "...", "phase": "building", "moduleProgress": "3/5", "elapsed": "12m", "cost": 3.20 } ],
    "planned": [ { "specTitle": "...", "layer": 0, "depCount": 0, "estimatedCost": null } ]
  }
  ```
- Data sourced from: runs table (completed runs with cost/pass data), specs table (titles, status), spec_dependencies (DAG layer calculation)

### Module 4: Weekly Digest CLI

- `dark timeline digest --week` — outputs a formatted markdown summary to stdout
- Format:
  ```
  # Weekly Digest — Mar 1, 2026

  ## Completed (3)
  - **Add caching layer** — completed Mon, $4.23, 8/8 scenarios
  - **Fix auth redirect** — completed Tue, $1.10, 5/5 scenarios
  - **Dashboard redesign** — completed Thu, $12.87, 12/12 scenarios

  ## In Progress (1)
  - **Notification system** — building module 2/4, $3.50 so far

  ## Planned (4)
  - Layer 0: Budget auto-pause, Spec from GitHub
  - Layer 1: Executive timeline
  - Layer 2: Run output showcase

  **Total cost this week: $18.20**
  ```
- `dark timeline digest --month` — same but for the current calendar month

### Module 5: Copy as Markdown

- "Copy as Markdown" button in the Timeline tab header
- Copies the current timeline view as clean markdown to the clipboard
- Format matches the `dark timeline digest` output
- Suitable for pasting into Slack, email, Notion, or Google Docs without reformatting

## Scenarios

### Functional

1. **Timeline shows completed specs**: Build 3 specs to completion across different days. Open the Timeline tab. Verify all 3 appear in the correct time group (This Week / Last Week / Earlier) with title, cost, and pass rate.

2. **In-progress specs shown**: Start a build. Open the Timeline tab. Verify the building spec appears in "In Progress" with its current phase and cost so far.

3. **Planned specs from backlog**: Have 5 draft specs with dependencies forming 3 layers. Open the Timeline tab. Verify they appear in "Planned" ordered by dependency layer.

4. **Weekly digest CLI**: Complete 2 specs, have 1 in progress. Run `dark timeline digest --week`. Verify the output is clean markdown with correct completed/in-progress/planned sections and totals.

5. **Copy as Markdown**: Click the "Copy as Markdown" button in the Timeline tab. Paste into a text editor. Verify the output is well-formatted markdown with no HTML artifacts or broken formatting.

6. **Summary stats accurate**: Complete 3 specs with costs $5, $8, $12 and pass rates 100%, 87.5%, 100%. Verify summary bar shows: 3 completed, $25 total cost, 95.8% average pass rate.

7. **Empty timeline**: Fresh project with no completed runs. Verify the Timeline tab shows a clean empty state ("No specs completed yet") rather than a broken or blank view.

### Changeability

1. **Change time grouping**: Switching from calendar weeks to rolling 7-day windows should require changing the date bucketing logic in the API — no UI or formatting changes.

2. **Add filtering by spec type**: Adding a "bug / feature" filter to the timeline should require adding a query parameter to `GET /api/timeline` and a filter dropdown in the UI — no changes to the data model.
