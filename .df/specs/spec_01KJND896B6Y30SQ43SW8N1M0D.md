---
id: spec_01KJND896B6Y30SQ43SW8N1M0D
title: "Fix dark dash: server falls back to raw JSON instead of rendering the dashboard UI"
type: bug
status: completed
version: 0.1.0
priority: high
---

# Fix dark dash: server uses placeholder instead of real UI

## Goal

When you run `dark dash`, the browser shows raw JSON instead of the styled dashboard. The UI module (`src/dashboard/index.ts`) has a full implementation with dark theme, status badges, agent cards, module grid, progress bars, and auto-refresh — but the server never loads it.

## Root Cause

In `src/dashboard/server.ts` lines 528-537, the server tries to dynamically import `./ui.js`:

```typescript
const uiModPath = new URL("./ui.js", import.meta.url).pathname;
const uiMod = await import(uiModPath).catch(() => null);
```

This fails because:
1. The UI module is at `src/dashboard/index.ts`, not `src/dashboard/ui.ts` or `src/dashboard/ui.js`
2. The dynamic import silently catches the error and falls back to `getDefaultHtml()` which renders a minimal placeholder that dumps raw JSON

## Requirements

### Fix the import (`src/dashboard/server.ts`)
- Replace the dynamic import with a static import of `generateDashboardHtml` from `./index.js`
- Remove the `getDefaultHtml` fallback and the `try/catch` around the dynamic import — the UI module is always available (it's in the same package)
- Pass the project name from config to `generateDashboardHtml({ projectName })`
- Delete the `getDefaultHtml` function entirely — it's dead code after this fix

### Verify the UI renders correctly
- The dashboard HTML from `generateDashboardHtml()` must be served at `/`
- The inline JavaScript must successfully fetch from `/api/runs` and render run cards in the sidebar
- Clicking a run card must load agents and modules into the detail panel
- Status badges must show colored pills (running=green, failed=red, completed=green, pending=gray)
- The auto-refresh indicator (pulsing green dot) must be visible in the header
- Cost, tokens, and elapsed time must display for each agent

## Scenarios

### Functional

1. **Dashboard renders styled UI**: Start `dark dash`, open browser. Verify the page has a dark background (#0d1117), a header with project name, a sidebar with run cards, and is NOT showing raw JSON.

2. **Run cards clickable**: Click a run in the sidebar. Verify the detail panel appears with run header (status badge, phase, cost, elapsed), agent tab, and modules tab.

3. **Agents display correctly**: Select a run with agents. Verify each agent shows as a card with name, role, status badge, cost, tokens, and elapsed time.

4. **Auto-refresh works**: Start `dark dash` while a build is running. Verify the status updates every 5 seconds without manual reload.

5. **Empty state**: Start `dark dash` with no runs. Verify it shows "No runs found" instead of crashing.
