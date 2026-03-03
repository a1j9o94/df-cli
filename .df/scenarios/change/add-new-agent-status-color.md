---
name: add-new-agent-status-color
type: change
spec_id: run_01KJRQYQMGFJ5J31M5F5CCD6KM
created_by: agt_01KJRQYQMH3ZCH0EQ5168F1SV9
---

Modification: Add a new agent status 'retrying' with orange color and animated indicator.
Steps required:
1. Add CSS rule .agent-status-indicator.retrying with background: var(--accent-orange) and animation: pulse
2. Add CSS rule .status-badge.retrying with appropriate orange background
3. No JS changes needed — the renderAgents function already uses the dynamic status class
Affected areas: src/dashboard/index.ts generateStyles() function only.
Expected effort: 2 lines of CSS added. No JS changes. No server changes. Under 5 minutes.
Pass criteria: Adding a new status should require ONLY CSS additions (no JS logic changes); the existing pattern of using dynamic status class in agent-status-indicator span handles it automatically.