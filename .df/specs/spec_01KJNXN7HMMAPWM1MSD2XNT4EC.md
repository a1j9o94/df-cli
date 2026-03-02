---
id: spec_01KJNXN7HMMAPWM1MSD2XNT4EC
title: "Update README with dashboard screenshots and visual documentation"
type: feature
status: draft
version: 0.1.0
priority: low
depends_on:
  - spec_01KJNFCE66DE8MM1SH5NQF0GG8
---

# README Visual Documentation

## Goal

After the dashboard is redesigned around the workplan/roadmap view, capture screenshots of each dashboard state and add them to the README. The README should visually show what dark does — a new user should understand the pipeline, the dashboard, and the agent lifecycle from screenshots alone.

## Requirements

- Capture screenshots of:
  1. `dark dash` — project-level dashboard with an active run (phase bar, module grid, agent timeline)
  2. `dark dash` — completed run showing evaluation results and cost summary
  3. `dark dash` — roadmap tab showing spec dependency graph with mixed statuses
  4. `dark dash` — failed run showing error diagnosis view
  5. Terminal output of `dark build` in progress (the `[dark]` guardrail messages)
  6. Terminal output of `dark status` and `dark agent list`
- Store screenshots in `docs/screenshots/` as PNGs
- Add a "Screenshots" or "What it looks like" section to README between "How It Works" and "Agent Roles"
- Use descriptive alt text for accessibility
## Scenarios

### Functional

1. **README has screenshots section**: Verify README.md contains image references pointing to `docs/screenshots/`. Verify all referenced files exist.

2. **Screenshots show real data**: Screenshots should show a real (or realistic demo) pipeline run, not placeholder data. The builder agent should start `dark dash`, run a demo build, and use Playwright to capture each state.

### Changeability

1. **Easy to re-capture**: If the dashboard changes, a builder agent can re-run the same process — start dash, build a demo spec, screenshot each phase. No special tooling needed.
