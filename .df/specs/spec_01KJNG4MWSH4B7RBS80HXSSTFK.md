---
id: spec_01KJNG4MWSH4B7RBS80HXSSTFK
title: Add config editor to dashboard for live project configuration
type: feature
status: draft
version: 0.1.0
priority: medium
---

# Config editor in dashboard

## Goal

Let users view and edit `.df/config.yaml` from the dashboard without leaving the browser. The current config controls critical pipeline behavior (budget, parallelism, thresholds, model pricing) but the only way to change it is editing YAML by hand. A dashboard settings panel makes this accessible to PMs and team leads who don't want to touch YAML.

## Requirements

### API endpoints (`src/dashboard/server.ts`)

- `GET /api/config` — return the current config as JSON (read from `.df/config.yaml`, merged with defaults)
- `PUT /api/config` — accept a partial config JSON, deep-merge with current, write back to `.df/config.yaml`
- Validate the config before writing — reject invalid values (negative budgets, unknown modes, etc.)
- Return the merged result so the UI shows what actually got saved

### Dashboard UI: Settings tab (`src/dashboard/index.ts`)

Add a Settings tab (gear icon) to the dashboard with grouped form fields:

**Build Settings**
- Default mode: dropdown (quick / thorough)
- Max parallel builders: number input (1-16)
- Budget cap: dollar input with slider
- Max iterations: number input (1-10)

**Runtime**
- Agent binary: text input (default: "claude")
- Heartbeat timeout: number input in seconds (shows as ms internally)
- Max agent lifetime: number input in minutes

**Thresholds**
- Satisfaction threshold: slider 0.0 - 1.0
- Changeability threshold: slider 0.0 - 1.0

**Cost Estimation**
- Cost per minute: dollar input
- Tokens per minute: number input
- Model profile: dropdown (sonnet / opus / haiku / custom) — pre-fills cost fields

**Resources**
- Max worktrees: number input
- Max API slots: number input

### UI behavior

- Load current config on tab open
- Show defaults vs overrides (gray out fields that match defaults, highlight changed ones)
- Save button writes to config.yaml
- Undo button reverts to last saved state
- Show a "Config saved" toast notification on success
- Show validation errors inline next to the field

### Safety

- Config changes take effect on the NEXT build, not retroactively on running builds
- Show a warning: "Changes apply to new builds only. Running builds use the config from when they started."
- Don't allow editing while a build is actively in the merge phase (config changes mid-merge could cause issues)

## Scenarios

### Functional

1. **View config**: Open settings tab. Verify all current config values are displayed correctly.
2. **Edit and save**: Change max_parallel to 2, save. Verify `.df/config.yaml` has the new value. Start a new build. Verify it uses max_parallel=2.
3. **Validation**: Set budget to -5. Verify the save is rejected with an inline error.
4. **Defaults highlighted**: On a fresh project with no config overrides, verify all fields show as "default" / grayed out. Change one field. Verify it highlights as overridden.
5. **API directly**: `PUT /api/config` with `{"build":{"max_parallel":2}}`. Verify it merges (doesn't overwrite other fields). `GET /api/config` shows the change.

### Changeability

1. **Add new config field**: Adding a new field to `DfConfig` should require adding a form field in the UI and a validation rule — no API changes needed since it accepts partial JSON.
