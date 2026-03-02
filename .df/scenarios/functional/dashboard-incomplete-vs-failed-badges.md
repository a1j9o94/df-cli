---
name: dashboard-incomplete-vs-failed-badges
type: functional
spec_id: run_01KJR04XQAYBX32C17TQTRNYD0
created_by: agt_01KJR04XQCHDRJMFPFA5FH4XQ1
---

## Scenario: Dashboard shows incomplete with amber badge, failed with red

### Preconditions
- A run exists with multiple agents:
  - Agent A: status = `completed` (green badge)
  - Agent B: status = `failed` (red badge)
  - Agent C: status = `incomplete` (amber badge)
  - Agent D: status = `running` (blue badge)

### Steps
1. Dashboard HTML is generated via `generateDashboardHtml()`
2. The dashboard fetches agent data via its API
3. For each agent, the status is rendered as a badge with a color

### Expected Outputs
- `completed` agents: green badge (--accent-green / #3fb950)
- `failed` agents: red badge (--accent-red / #f85149)
- `incomplete` agents: amber/yellow badge (approximately #e3b341 or --accent-yellow / --accent-amber)
- `running` agents: blue badge (--accent-blue / #58a6ff)
- All four statuses are distinct and visually distinguishable
- The `dark agent list` command also shows `incomplete` status with appropriate formatting

### Additional Check: Agent List Command
- Running `dark agent list --run-id <run-id>` shows:
  - Agent A: `completed` status
  - Agent B: `failed` status
  - Agent C: `incomplete` status
  - Agent D: `running` status
- Each with branch state if applicable (staging vs ready)

### Pass/Fail Criteria
- PASS: Amber badge for incomplete is visually distinct from red (failed) and yellow (other). Agent list shows incomplete status with branch info.
- FAIL: Incomplete renders same as failed, or no color defined for incomplete, or agent list doesn't show branch state