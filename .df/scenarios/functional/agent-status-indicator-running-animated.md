---
name: agent-status-indicator-running-animated
type: functional
spec_id: run_01KJRQYQMGFJ5J31M5F5CCD6KM
created_by: agt_01KJRQYQMH3ZCH0EQ5168F1SV9
---

Test: Running and spawning agents display animated (pulsing) status indicators; completed/failed/killed agents display static indicators.
Setup: Call generateDashboardHtml() to get the HTML string.
Steps:
1. Verify CSS class .agent-status-indicator exists as an 8px circle (border-radius: 50%)
2. Verify .agent-status-indicator.running has background: var(--accent-green) AND animation: pulse
3. Verify .agent-status-indicator.spawning has background: var(--accent-purple) AND animation: pulse
4. Verify .agent-status-indicator.completed has background: var(--accent-green) but NO animation property
5. Verify .agent-status-indicator.failed has background: var(--accent-red) but NO animation property
6. Verify .agent-status-indicator.killed has background: var(--accent-red) but NO animation property
7. Verify .agent-status-indicator.pending has background: var(--text-muted) but NO animation property
8. Verify .agent-status-indicator.paused has background: var(--accent-yellow) but NO animation property
9. In the renderAgents JS function, verify the agent-status-indicator span is added with the agents status as its class
Expected output: Animated indicators for running/spawning; static indicators for all other statuses.
Pass criteria: running and spawning CSS rules contain animation: pulse; completed, failed, killed, pending, paused CSS rules do NOT contain animation; renderAgents outputs span with class agent-status-indicator and status class.