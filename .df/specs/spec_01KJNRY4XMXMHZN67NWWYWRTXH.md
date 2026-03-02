---
id: spec_01KJNRY4XMXMHZN67NWWYWRTXH
title: "Architect research: save and share references across agents"
type: feature
status: draft
version: 0.1.0
priority: high
---

# Architect Research

## Goal

Let agents save research findings so other agents can reference them later. The architect searches the web, reads docs, takes screenshots — Claude Code already has all those tools. What's missing is a way to persist and share those findings across agent boundaries.

## Requirements

### Module 1: Research Command
- `dark research add <agent-id> --label <label> --content <content>` — save a text finding (URL, code snippet, API docs excerpt, decision rationale)
- `dark research add <agent-id> --label <label> --file <path>` — save a file (screenshot, downloaded doc)
- `dark research list --run-id <id>` — list all research for a run
- `dark research list --run-id <id> --module <module-id>` — list research tagged to a module
- `dark research show <research-id>` — show the content of a research item
- Optional: `--module <module-id>` tag on `add` so builders only see what's relevant to them

### Module 2: Storage
- Research artifacts stored in `.df/research/<run-id>/`
- Text content stored as markdown files
- File attachments stored as-is (PNG, PDF, etc.)
- DB table: `research_artifacts (id, run_id, agent_id, label, type, file_path, module_id, created_at)`
- Queryable by run, agent, module

### Module 3: Pipeline Integration
- Architect prompt mentions `dark research add` as available
- Builder instructions include: "Check research: `dark research list --run-id <id> --module <module-id>`"
- Evaluator can see all research for context

That's it. The agents already know how to search the web, read docs, and take screenshots. This just gives them a shared clipboard.

## Scenarios

### Functional

1. **Architect saves a URL reference**: Architect calls `dark research add <id> --label "Stripe SDK docs" --content "https://stripe.com/docs/api Use stripe@14.x, not 13.x — breaking changes in webhook signatures"`. Verify it's stored and retrievable.

2. **Architect saves a screenshot**: Architect takes a screenshot with Claude Code tools, then calls `dark research add <id> --label "Reference checkout flow" --file /tmp/screenshot.png`. Verify the file is copied to `.df/research/`.

3. **Builder retrieves research**: Builder calls `dark research list --run-id <id> --module payments`. Verify it returns only research tagged to that module.

4. **Research persists across agents**: Architect saves research, architect process ends, builder starts in a new process. Verify builder can still access the research.

### Changeability

1. **Add search integration**: If we later want `dark research search <query>` to wrap WebSearch and auto-save results, it should be a thin wrapper around `dark research add`. No storage changes needed.
