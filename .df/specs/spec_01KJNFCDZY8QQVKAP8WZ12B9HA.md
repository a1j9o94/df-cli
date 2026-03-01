---
id: spec_01KJNFCDZY8QQVKAP8WZ12B9HA
title: Dashboard polls trigger cost estimation for running agents
type: feature
status: draft
version: 0.1.0
priority: medium
---

# Dashboard polls trigger cost estimation for running agents

## Goal

The dashboard polls `/api/runs/:id` every 5 seconds. Each poll should update cost estimates for running agents so the cost display ticks up in real-time instead of staying at $0 until the agent finishes.

## Requirements

### Server-side cost estimation on API reads (`src/dashboard/server.ts`)

When the dashboard API serves agent data for a running agent, compute an estimated cost based on elapsed time:
- Read `created_at` and `last_heartbeat` (or current time if no heartbeat)
- Compute elapsed minutes
- Use the hardcoded rate ($0.05/min) or config rate if available
- Return this as `estimatedCost` alongside the DB `cost` field
- Do NOT write to the DB on reads — this is a display-only estimate
- The actual cost gets recorded when agents call system commands (separate spec handles that)

### Frontend display

- Show `estimatedCost` when `cost` is 0 and agent is running
- Add a `~` prefix to indicate it's estimated: `~$0.25`
- When `cost > 0` (agent self-reported), show the real cost without `~`
- Run-level cost in the header should sum estimated + real costs

## Scenarios

### Functional

1. **Cost ticks up**: Open dashboard during a build. Verify cost display increases every 5 seconds for running agents.
2. **Estimate vs real**: Agent completes and reports real cost. Verify the `~` prefix disappears and the number changes to the real value.
