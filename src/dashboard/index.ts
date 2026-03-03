/**
 * Dashboard UI module for Dark Factory.
 *
 * Exports a single function that returns a self-contained HTML string
 * for the Dark Factory monitoring dashboard. The HTML includes all
 * CSS and JavaScript inline — no external dependencies.
 *
 * Contracts consumed:
 * - DashboardAPI: API endpoint shapes
 * - RunSummary: Run list/detail data shape
 * - AgentSummary: Agent data shape
 * - ModuleStatus: Module progress data shape
 * - UIExport: This module's export interface
 */

export interface DashboardConfig {
  projectName?: string;
  apiBase?: string;
}

export function generateDashboardHtml(config?: DashboardConfig): string {
  const projectName = config?.projectName ?? "Dark Factory";
  const apiBase = config?.apiBase ?? "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(projectName)} Dashboard</title>
  ${generateStyles()}
</head>
<body>
  <div id="app">
    <header class="header">
      <h1 class="header-title">${escapeHtml(projectName)}</h1>
      <div class="header-controls">
        <span class="auto-refresh-indicator" id="refresh-indicator">●</span>
        <span class="header-subtitle">Dashboard</span>
      </div>
    </header>
    <main class="main">
      <section class="sidebar" id="runs-list">
        <h2 class="section-title">Runs</h2>
        <div class="runs-container" id="runs-container">
          <div class="loading">Loading runs...</div>
        </div>
      </section>
      <section class="content" id="run-detail">
        <div class="empty-state" id="empty-state">
          <p>Select a run to view details</p>
        </div>
        <div class="detail-panels" id="detail-panels" style="display:none">
          <div class="run-header" id="run-header"></div>
          <div class="phase-timeline" id="phases-container"></div>
          <div class="tab-bar" id="tab-bar">
            <button class="tab active" data-tab="agents">Agents</button>
            <button class="tab" data-tab="modules">Modules</button>
          </div>
          <div class="tab-content" id="tab-content">
            <div class="tab-panel active" id="agents-panel">
              <h3 class="panel-title">Agents</h3>
              <div id="agents-container"></div>
            </div>
            <div class="tab-panel" id="modules-panel">
              <h3 class="panel-title">Modules</h3>
              <div id="modules-container"></div>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
  ${generateScript(apiBase)}
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function generateStyles(): string {
  return `<style>
  :root {
    --bg-primary: #0d1117;
    --bg-secondary: #161b22;
    --bg-tertiary: #21262d;
    --border: #30363d;
    --text-primary: #e6edf3;
    --text-secondary: #8b949e;
    --text-muted: #6e7681;
    --accent-blue: #58a6ff;
    --accent-green: #3fb950;
    --accent-red: #f85149;
    --accent-yellow: #d29922;
    --accent-purple: #bc8cff;
    --accent-orange: #db6d28;
    --font-mono: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
    --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: var(--font-sans);
    background: var(--bg-primary);
    color: var(--text-primary);
    line-height: 1.5;
    min-height: 100vh;
  }

  #app {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border);
  }

  .header-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .header-controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .header-subtitle {
    font-size: 13px;
    color: var(--text-secondary);
  }

  .auto-refresh-indicator {
    color: var(--accent-green);
    font-size: 10px;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  .main {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .sidebar {
    width: 280px;
    min-width: 280px;
    background: var(--bg-secondary);
    border-right: 1px solid var(--border);
    overflow-y: auto;
    padding: 12px;
  }

  .section-title {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-secondary);
    margin-bottom: 8px;
    padding: 0 4px;
  }

  .content {
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px;
  }

  .loading {
    color: var(--text-muted);
    font-size: 13px;
    padding: 12px 4px;
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 200px;
    color: var(--text-muted);
    font-size: 14px;
  }

  .run-card {
    padding: 10px 12px;
    border-radius: 6px;
    cursor: pointer;
    margin-bottom: 4px;
    border: 1px solid transparent;
    transition: background 0.15s, border-color 0.15s;
  }

  .run-card:hover {
    background: var(--bg-tertiary);
  }

  .run-card.active {
    background: var(--bg-tertiary);
    border-color: var(--accent-blue);
  }

  .run-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
  }

  .run-card-id {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--accent-blue);
  }

  .run-card-spec {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 4px;
  }

  .run-card-meta {
    display: flex;
    gap: 8px;
    font-size: 11px;
    color: var(--text-secondary);
  }

  .status-badge {
    display: inline-block;
    padding: 1px 6px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 500;
    text-transform: capitalize;
  }

  .status-badge.running { background: rgba(63, 185, 80, 0.15); color: var(--accent-green); }
  .status-badge.completed { background: rgba(63, 185, 80, 0.15); color: var(--accent-green); }
  .status-badge.pending { background: rgba(139, 148, 158, 0.15); color: var(--text-secondary); }
  .status-badge.failed { background: rgba(248, 81, 73, 0.15); color: var(--accent-red); }
  .status-badge.paused { background: rgba(210, 153, 34, 0.15); color: var(--accent-yellow); }
  .status-badge.spawning { background: rgba(188, 140, 255, 0.15); color: var(--accent-purple); }
  .status-badge.killed { background: rgba(248, 81, 73, 0.15); color: var(--accent-red); }

  .run-header {
    margin-bottom: 16px;
    padding: 16px;
    background: var(--bg-secondary);
    border-radius: 8px;
    border: 1px solid var(--border);
  }

  .run-header-title {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
  }

  .run-header-title h2 {
    font-size: 18px;
    font-weight: 600;
  }

  .run-stats {
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
  }

  .stat {
    display: flex;
    flex-direction: column;
  }

  .stat-label {
    font-size: 11px;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .stat-value {
    font-size: 14px;
    font-weight: 500;
    font-family: var(--font-mono);
  }

  .progress-bar {
    width: 100%;
    height: 4px;
    background: var(--bg-tertiary);
    border-radius: 2px;
    margin-top: 10px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: var(--accent-green);
    border-radius: 2px;
    transition: width 0.3s;
  }

  .tab-bar {
    display: flex;
    gap: 2px;
    margin-bottom: 12px;
    border-bottom: 1px solid var(--border);
  }

  .tab {
    padding: 8px 16px;
    background: none;
    border: none;
    color: var(--text-secondary);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    transition: color 0.15s, border-color 0.15s;
  }

  .tab:hover {
    color: var(--text-primary);
  }

  .tab.active {
    color: var(--accent-blue);
    border-bottom-color: var(--accent-blue);
  }

  .tab-panel {
    display: none;
  }

  .tab-panel.active {
    display: block;
  }

  .panel-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 10px;
  }

  .agent-card, .module-card {
    padding: 12px 14px;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 6px;
    margin-bottom: 8px;
  }

  .agent-card-header, .module-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }

  .agent-name, .module-name {
    font-weight: 500;
    font-size: 14px;
  }

  .agent-role {
    font-size: 11px;
    color: var(--text-muted);
    font-family: var(--font-mono);
  }

  .agent-meta, .module-meta {
    display: flex;
    gap: 12px;
    font-size: 12px;
    color: var(--text-secondary);
    flex-wrap: wrap;
  }

  .meta-item {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .meta-label {
    color: var(--text-muted);
  }

  .error-text {
    color: var(--accent-red);
    font-size: 12px;
    margin-top: 6px;
    font-family: var(--font-mono);
  }

  .dep-bar {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 6px;
  }

  .dep-bar-track {
    flex: 1;
    height: 3px;
    background: var(--bg-tertiary);
    border-radius: 2px;
    overflow: hidden;
  }

  .dep-bar-fill {
    height: 100%;
    background: var(--accent-blue);
    border-radius: 2px;
  }

  .dep-bar-label {
    font-size: 11px;
    color: var(--text-muted);
    font-family: var(--font-mono);
    white-space: nowrap;
  }

  /* --- Run Card Alive Pulse --- */

  .run-card.alive {
    animation: glow-pulse 3s ease-in-out infinite;
  }

  @keyframes glow-pulse {
    0%, 100% { border-color: transparent; }
    50% { border-color: rgba(63, 185, 80, 0.3); }
  }

  /* --- Loading Spinner --- */

  .loading-spinner {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-muted);
    font-size: 13px;
    padding: 12px 4px;
  }

  .loading-spinner::before {
    content: "";
    display: inline-block;
    width: 14px;
    height: 14px;
    border: 2px solid var(--border);
    border-top-color: var(--accent-blue);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* --- Agent Status Indicator --- */

  .agent-status-indicator {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-right: 6px;
    vertical-align: middle;
  }

  .agent-status-indicator.running {
    background: var(--accent-green);
    animation: pulse 1.5s ease-in-out infinite;
  }

  .agent-status-indicator.spawning {
    background: var(--accent-purple);
    animation: pulse 1s ease-in-out infinite;
  }

  .agent-status-indicator.pending {
    background: var(--text-muted);
  }

  .agent-status-indicator.completed {
    background: var(--accent-green);
  }

  .agent-status-indicator.failed {
    background: var(--accent-red);
  }

  .agent-status-indicator.killed {
    background: var(--accent-red);
  }

  .agent-status-indicator.paused {
    background: var(--accent-yellow);
  }

  /* --- Agent Spinner (enhanced indicator for active agents) --- */

  .agent-spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid var(--border);
    border-top-color: var(--accent-green);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-left: 6px;
    vertical-align: middle;
  }

  .agent-spinner.spawning {
    border-top-color: var(--accent-purple);
  }

  /* --- Agent Status Icon (static icons for terminal states) --- */

  .agent-status-icon {
    display: inline-block;
    margin-left: 6px;
    font-size: 12px;
    vertical-align: middle;
  }

  .agent-status-icon.completed {
    color: var(--accent-green);
  }

  .agent-status-icon.failed {
    color: var(--accent-red);
  }

  .agent-status-icon.killed {
    color: var(--accent-red);
  }

  /* --- Phase Indicator --- */

  .phase-indicator {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-right: 4px;
    vertical-align: middle;
    background: var(--text-muted);
  }

  .phase-indicator.active {
    background: var(--accent-green);
    animation: pulse 1.5s ease-in-out infinite;
  }

  /* --- Phase Timeline --- */

  .phase-timeline {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-bottom: 12px;
    padding: 8px 0;
    overflow-x: auto;
  }

  .phase-step {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-family: var(--font-mono);
    white-space: nowrap;
  }

  .phase-step-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .phase-step-connector {
    width: 16px;
    height: 2px;
    background: var(--border);
    flex-shrink: 0;
  }

  .phase-completed {
    color: var(--accent-green);
  }

  .phase-completed .phase-step-dot {
    background: var(--accent-green);
  }

  .phase-completed .phase-step-connector {
    background: var(--accent-green);
  }

  .phase-active {
    color: var(--accent-blue);
    font-weight: 600;
    animation: phase-glow 2s ease-in-out infinite;
  }

  .phase-active .phase-step-dot {
    background: var(--accent-blue);
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes phase-glow {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }

  .phase-pending {
    color: var(--text-muted);
  }

  .phase-pending .phase-step-dot {
    background: var(--text-muted);
  }

  .phase-skipped {
    color: var(--text-muted);
    opacity: 0.5;
    text-decoration: line-through;
  }

  .phase-skipped .phase-step-dot {
    background: var(--text-muted);
    opacity: 0.5;
  }

  .phase-skipped .phase-step-connector {
    opacity: 0.5;
  }

  /* --- Estimated Cost --- */

  .cost-estimated {
    color: var(--text-muted);
    font-style: italic;
  }

  @media (max-width: 768px) {
    .main {
      flex-direction: column;
    }
    .sidebar {
      width: 100%;
      min-width: 100%;
      max-height: 200px;
      border-right: none;
      border-bottom: 1px solid var(--border);
    }
  }
</style>`;
}

function generateScript(apiBase: string): string {
  const escapedApiBase = escapeHtml(apiBase);
  return `<script>
(function() {
  "use strict";

  const apiBase = "${escapedApiBase}";
  let selectedRunId = null;
  let refreshTimer = null;
  const REFRESH_INTERVAL = 5000;

  // Phase order mirrors src/pipeline/phases.ts — data-driven rendering
  var PHASE_ORDER = ["scout", "architect", "plan-review", "build", "integrate", "evaluate-functional", "evaluate-change", "merge"];

  // --- API helpers ---

  async function fetchJson(path) {
    const url = apiBase + path;
    const resp = await fetch(url);
    if (!resp.ok) {
      const body = await resp.json().catch(() => ({}));
      throw new Error(body.error || "HTTP " + resp.status);
    }
    return resp.json();
  }

  // --- Rendering helpers ---

  function statusBadge(status) {
    return '<span class="status-badge ' + (status || "pending") + '">' + esc(status || "unknown") + '</span>';
  }

  function esc(s) {
    if (s == null) return "";
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function formatCost(n) {
    return "$" + Number(n || 0).toFixed(4);
  }

  function formatCostDisplay(cost, estimatedCost, isEstimate) {
    if (isEstimate && estimatedCost > 0) {
      return '<span class="cost-estimated">~' + formatCost(estimatedCost) + '</span>';
    }
    return formatCost(cost);
  }

  function formatTokens(n) {
    const num = Number(n || 0);
    if (num >= 1e6) return (num / 1e6).toFixed(1) + "M";
    if (num >= 1e3) return (num / 1e3).toFixed(1) + "K";
    return String(num);
  }

  // --- Fetch and render runs list ---

  async function loadRuns() {
    try {
      const runs = await fetchJson("/api/runs");
      renderRunsList(runs);
    } catch (err) {
      document.getElementById("runs-container").innerHTML =
        '<div class="loading">Error loading runs: ' + esc(err.message) + '</div>';
    }
  }

  function renderRunsList(runs) {
    const container = document.getElementById("runs-container");
    if (!runs || runs.length === 0) {
      container.innerHTML = '<div class="loading">No runs found</div>';
      return;
    }
    container.innerHTML = runs.map(function(run) {
      const isActive = run.id === selectedRunId ? " active" : "";
      const isAlive = run.status === "running" ? " alive" : "";
      const progress = run.moduleCount > 0
        ? Math.round((run.completedCount / run.moduleCount) * 100) : 0;
      return '<div class="run-card' + isActive + isAlive + '" data-run-id="' + esc(run.id) + '">'
        + '<div class="run-card-header">'
        + '<span class="run-card-id">' + esc(run.id.slice(0, 16)) + '…</span>'
        + statusBadge(run.status)
        + '</div>'
        + '<div class="run-card-spec">' + esc(run.specId) + '</div>'
        + '<div class="run-card-meta">'
        + '<span>' + esc(run.phase || "—") + '</span>'
        + '<span>' + esc(run.elapsed) + '</span>'
        + '<span>' + esc(run.completedCount) + '/' + esc(run.moduleCount) + '</span>'
        + '</div>'
        + '<div class="progress-bar"><div class="progress-fill" style="width:' + progress + '%"></div></div>'
        + '</div>';
    }).join("");

    // Bind click events
    container.querySelectorAll(".run-card").forEach(function(card) {
      card.addEventListener("click", function() {
        selectRun(card.dataset.runId);
      });
    });
  }

  // --- Fetch and render run detail ---

  async function selectRun(runId) {
    selectedRunId = runId;
    document.getElementById("empty-state").style.display = "none";
    document.getElementById("detail-panels").style.display = "block";

    // Highlight active card
    document.querySelectorAll(".run-card").forEach(function(c) {
      c.classList.toggle("active", c.dataset.runId === runId);
    });

    await Promise.all([
      loadRunDetail(runId, true),
      loadAgents(runId, true),
      loadModules(runId, true),
      loadPhases(runId, true)
    ]);
  }

  async function loadRunDetail(runId, showSpinner) {
    var header = document.getElementById("run-header");
    if (showSpinner) {
      header.innerHTML = '<div class="loading-spinner">Loading run detail\u2026</div>';
    }
    try {
      const run = await fetchJson("/api/runs/" + runId);
      renderRunHeader(run);
    } catch (err) {
      header.innerHTML =
        '<div class="error-text">Error: ' + esc(err.message) + '</div>';
    }
  }

  function renderRunHeader(run) {
    const progress = run.moduleCount > 0
      ? Math.round((run.completedCount / run.moduleCount) * 100) : 0;
    var totalCost = run.cost + (run.estimatedCost || 0);
    const budgetPct = run.budget > 0
      ? Math.round((totalCost / run.budget) * 100) : 0;
    var costDisplay = run.estimatedCost > 0
      ? formatCost(run.cost) + ' + <span class="cost-estimated">~' + formatCost(run.estimatedCost) + '</span>'
      : formatCost(run.cost);

    document.getElementById("run-header").innerHTML =
      '<div class="run-header-title">'
      + '<h2>' + esc(run.specId) + '</h2>'
      + statusBadge(run.status)
      + '</div>'
      + '<div class="run-stats">'
      + '<div class="stat"><span class="stat-label">Phase</span><span class="stat-value"><span class="phase-indicator' + (run.status === "running" ? ' active' : '') + '"></span>' + esc(run.phase || "—") + '</span></div>'
      + '<div class="stat"><span class="stat-label">Elapsed</span><span class="stat-value">' + esc(run.elapsed) + '</span></div>'
      + '<div class="stat"><span class="stat-label">Cost</span><span class="stat-value">' + costDisplay + ' / ' + formatCost(run.budget) + ' (' + budgetPct + '%)</span></div>'
      + '<div class="stat"><span class="stat-label">Tokens</span><span class="stat-value">' + formatTokens(run.tokensUsed) + '</span></div>'
      + '<div class="stat"><span class="stat-label">Modules</span><span class="stat-value">' + esc(run.completedCount) + ' / ' + esc(run.moduleCount) + '</span></div>'
      + '</div>'
      + '<div class="progress-bar"><div class="progress-fill" style="width:' + progress + '%"></div></div>'
      + (run.error ? '<div class="error-text">' + esc(run.error) + '</div>' : '');
  }

  // --- Agents ---

  async function loadAgents(runId, showSpinner) {
    var container = document.getElementById("agents-container");
    if (showSpinner) {
      container.innerHTML = '<div class="loading-spinner">Loading agents\u2026</div>';
    }
    try {
      const agents = await fetchJson("/api/runs/" + runId + "/agents");
      renderAgents(agents);
    } catch (err) {
      container.innerHTML =
        '<div class="error-text">Error: ' + esc(err.message) + '</div>';
    }
  }

  function renderAgents(agents) {
    const container = document.getElementById("agents-container");
    if (!agents || agents.length === 0) {
      container.innerHTML = '<div class="loading">No agents</div>';
      return;
    }
    container.innerHTML = agents.map(function(a) {
      var statusClass = (a.status || "pending");
      var costDisplay = formatCostDisplay(a.cost, a.estimatedCost, a.isEstimate);
      // Enhanced spinner for running/spawning; static icon for completed/failed/killed
      var spinnerHtml = "";
      if (statusClass === "running") {
        spinnerHtml = '<span class="agent-spinner"></span>';
      } else if (statusClass === "spawning") {
        spinnerHtml = '<span class="agent-spinner spawning"></span>';
      } else if (statusClass === "completed") {
        spinnerHtml = '<span class="agent-status-icon completed">\u2713</span>';
      } else if (statusClass === "failed") {
        spinnerHtml = '<span class="agent-status-icon failed">\u2717</span>';
      } else if (statusClass === "killed") {
        spinnerHtml = '<span class="agent-status-icon killed">\u2717</span>';
      }
      return '<div class="agent-card">'
        + '<div class="agent-card-header">'
        + '<span class="agent-name"><span class="agent-status-indicator ' + esc(statusClass) + '"></span>' + esc(a.name) + spinnerHtml + '</span>'
        + statusBadge(a.status)
        + '</div>'
        + '<span class="agent-role">' + esc(a.role) + (a.moduleId ? ' \u2192 ' + esc(a.moduleId) : '') + '</span>'
        + '<div class="agent-meta">'
        + '<span class="meta-item"><span class="meta-label">Cost:</span> ' + costDisplay + '</span>'
        + '<span class="meta-item"><span class="meta-label">Tokens:</span> ' + formatTokens(a.tokens) + '</span>'
        + '<span class="meta-item"><span class="meta-label">Elapsed:</span> ' + esc(a.elapsed) + '</span>'
        + (a.tddPhase ? '<span class="meta-item"><span class="meta-label">TDD:</span> ' + esc(a.tddPhase) + ' (' + esc(a.tddCycles) + ' cycles)</span>' : '')
        + '</div>'
        + (a.error ? '<div class="error-text">' + esc(a.error) + '</div>' : '')
        + '</div>';
    }).join("");
  }

  // --- Modules ---

  async function loadModules(runId, showSpinner) {
    var container = document.getElementById("modules-container");
    if (showSpinner) {
      container.innerHTML = '<div class="loading-spinner">Loading modules\u2026</div>';
    }
    try {
      const modules = await fetchJson("/api/runs/" + runId + "/modules");
      renderModules(modules);
    } catch (err) {
      container.innerHTML =
        '<div class="error-text">Error: ' + esc(err.message) + '</div>';
    }
  }

  function renderModules(modules) {
    const container = document.getElementById("modules-container");
    if (!modules || modules.length === 0) {
      container.innerHTML = '<div class="loading">No modules</div>';
      return;
    }
    container.innerHTML = modules.map(function(m) {
      const depsPct = m.depsTotal > 0
        ? Math.round((m.depsSatisfied / m.depsTotal) * 100) : 100;
      const contractPct = m.contractsTotal > 0
        ? Math.round((m.contractsAcknowledged / m.contractsTotal) * 100) : 100;
      var isEstimate = m.isEstimate === true;
      var costDisplay = isEstimate && m.estimatedCost > 0
        ? '<span class="cost-estimated">~' + formatCost(m.estimatedCost) + '</span>'
        : formatCost(m.cost);

      var moduleCostDisplay = formatCostDisplay(m.cost, m.estimatedCost, m.isEstimate);
      return '<div class="module-card">'
        + '<div class="module-card-header">'
        + '<span class="module-name">' + esc(m.title || m.id) + '</span>'
        + statusBadge(m.agentStatus)
        + '</div>'
        + '<div class="module-meta">'
        + '<span class="meta-item"><span class="meta-label">Cost:</span> ' + moduleCostDisplay + '</span>'
        + '<span class="meta-item"><span class="meta-label">Tokens:</span> ' + formatTokens(m.tokens) + '</span>'
        + (m.tddPhase ? '<span class="meta-item"><span class="meta-label">TDD:</span> ' + esc(m.tddPhase) + ' (' + esc(m.tddCycles) + ' cycles)</span>' : '')
        + '<span class="meta-item"><span class="meta-label">Files:</span> ' + esc(m.filesChanged) + '</span>'
        + '</div>'
        + '<div class="dep-bar">'
        + '<span class="dep-bar-label">Deps ' + esc(m.depsSatisfied) + '/' + esc(m.depsTotal) + '</span>'
        + '<div class="dep-bar-track"><div class="dep-bar-fill" style="width:' + depsPct + '%"></div></div>'
        + '</div>'
        + '<div class="dep-bar">'
        + '<span class="dep-bar-label">Contracts ' + esc(m.contractsAcknowledged) + '/' + esc(m.contractsTotal) + '</span>'
        + '<div class="dep-bar-track"><div class="dep-bar-fill" style="width:' + contractPct + '%"></div></div>'
        + '</div>'
        + '</div>';
    }).join("");
  }

  // --- Phases ---

  async function loadPhases(runId, showSpinner) {
    var container = document.getElementById("phases-container");
    if (showSpinner) {
      container.innerHTML = '<div class="loading-spinner">Loading phases\u2026</div>';
    }
    try {
      var phases = await fetchJson("/api/runs/" + runId + "/phases");
      renderPhaseTimeline(phases);
    } catch (err) {
      // Fallback: derive phases client-side from run data if API unavailable
      renderPhaseTimelineFallback();
    }
  }

  function renderPhaseTimeline(phases) {
    var container = document.getElementById("phases-container");
    if (!phases || phases.length === 0) {
      container.innerHTML = "";
      return;
    }
    // Map status to CSS class: phase-completed, phase-active, phase-pending, phase-skipped
    var STATUS_CLASSES = {
      "completed": "phase-completed",
      "active": "phase-active",
      "pending": "phase-pending",
      "skipped": "phase-skipped"
    };
    container.innerHTML = phases.map(function(p, i) {
      var statusClass = STATUS_CLASSES[p.status] || "phase-pending";
      var label = p.label || p.id;
      var connector = i < phases.length - 1
        ? '<span class="phase-step-connector"></span>'
        : '';
      return '<span class="phase-step ' + statusClass + '">'
        + '<span class="phase-step-dot"></span>'
        + '<span class="phase-step-label">' + esc(label) + '</span>'
        + '</span>'
        + connector;
    }).join("");
  }

  function renderPhaseTimelineFallback() {
    // Client-side fallback using PHASE_ORDER and last known run data
    var container = document.getElementById("phases-container");
    container.innerHTML = "";
  }

  // --- Tab switching ---

  document.getElementById("tab-bar").addEventListener("click", function(e) {
    if (!e.target.classList.contains("tab")) return;
    document.querySelectorAll(".tab").forEach(function(t) { t.classList.remove("active"); });
    e.target.classList.add("active");
    document.querySelectorAll(".tab-panel").forEach(function(p) { p.classList.remove("active"); });
    document.getElementById(e.target.dataset.tab + "-panel").classList.add("active");
  });

  // --- Auto-refresh ---

  async function refresh() {
    await loadRuns();
    if (selectedRunId) {
      await Promise.all([
        loadRunDetail(selectedRunId, false),
        loadAgents(selectedRunId, false),
        loadModules(selectedRunId, false),
        loadPhases(selectedRunId, false)
      ]);
    }
  }

  // Initial load
  loadRuns().catch(function(err) {
    console.error("Initial load failed:", err);
  });

  // Poll every 5 seconds
  refreshTimer = setInterval(function() {
    refresh().catch(function(err) {
      console.error("Refresh failed:", err);
    });
  }, REFRESH_INTERVAL);
})();
</script>`;
}
