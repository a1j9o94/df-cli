---
id: spec_01KJNX6NANE1QVF7ASFHS6YGR5
title: "Use dark.localhost for dashboard via portless integration"
type: feature
status: draft
version: 0.1.0
priority: low
depends_on:
  - spec_01KJN8Y00BHFZWKCESPBZZVM7T
---

# dark.localhost Dashboard Domain

## Goal

When `dark dash` starts, serve the dashboard at `dark.localhost` instead of `localhost:3141`. Uses [portless](https://github.com/vercel-labs/portless) to map `.localhost` subdomains to local ports without config.

## Requirements

- Install `portless` as a dependency (or detect if available)
- When `dark dash` starts on port 3141, also register `dark.localhost` → `localhost:3141`
- Browser opens `http://dark.localhost` instead of `http://localhost:3141`
- For workspace projects, could use `dark.localhost/<project>` or `<project>.dark.localhost`
- Fallback to `localhost:3141` if portless is not available
- `dark dash --no-portless` to skip the domain mapping

## Scenarios

### Functional

1. **Dashboard at dark.localhost**: Run `dark dash`. Verify browser opens `http://dark.localhost`. Verify the page loads correctly.

2. **Fallback without portless**: Uninstall portless. Run `dark dash`. Verify it falls back to `localhost:3141` with a note that portless is not installed.

3. **Workspace subdomains**: In a workspace with `frontend` and `backend` projects, verify `dark.localhost/frontend` and `dark.localhost/backend` route to the correct project views.
