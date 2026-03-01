---
id: spec_01KJNFCE34GE17823DW184KR2A
title: Add loading indicators to dashboard for active agents and phases
type: feature
status: draft
version: 0.1.0
priority: medium
---

# Add loading indicators to dashboard

## Goal

When a pipeline is running, the dashboard looks frozen. There's no visual indication that work is happening. A "Running" badge is static text — the user can't tell if the agent is stuck or actively working. Add CSS animations that make activity visible at a glance.

## Requirements

### Phase progress bar animation (`src/dashboard/index.ts`)

The horizontal progress bar should animate for active phases:
- Completed phases: solid green fill, no animation
- Current phase: pulsing/breathing animation on the fill, or a moving gradient stripe (like a barber pole)
- Failed phase: solid red, no animation
- Pending phases: gray, no animation

### Agent card activity indicator

Running agents should have a visible activity indicator:
- CSS-only animated spinner (3 bouncing dots, or a rotating ring) next to the "Running" badge
- The spinner replaces the static green dot
- When the agent completes, the spinner stops and shows a checkmark
- When the agent fails, show an X

### Run card in sidebar

The run card for active runs should pulse subtly — a very slow border glow or a thin animated stripe at the bottom — so the user can see at a glance which runs are alive.

### Implementation constraints

- All CSS-only — no external assets, no GIFs, no JavaScript animation libraries
- Must work in the inline `<style>` block in `generateStyles()`
- Keep the dark theme aesthetic
- Animations should be subtle, not distracting

## Scenarios

### Functional

1. **Spinner visible on running agent**: Start a build, open dashboard. Verify the architect agent card has an animated spinner next to "Running".
2. **Spinner stops on completion**: Wait for agent to complete. Verify spinner is replaced by a static indicator.
3. **Progress bar animates**: Verify the phase progress bar has a moving animation during active builds.
4. **No animation on completed runs**: Select a completed run. Verify no spinners or animations.
