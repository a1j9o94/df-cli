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
      <section class="sidebar" id="specs-list">
        <div class="sidebar-header">
          <h2 class="section-title">Specs</h2>
          <button class="new-spec-btn" id="new-spec-btn">+ New Spec</button>
        </div>
        <div class="specs-container" id="specs-container">
          <div class="loading">Loading specs...</div>
<<<<<<< HEAD
=======
        </div>
        <h2 class="section-title" style="margin-top:16px">Runs</h2>
        <div class="runs-container" id="runs-container">
          <div class="loading">Loading runs...</div>
>>>>>>> df-build/run_01KK/editor-and-build-mmhl1ta5
        </div>
      </section>
      <section class="content" id="run-detail">
        <div class="empty-state" id="empty-state">
<<<<<<< HEAD
          <p>Select a spec to view details</p>
        </div>
        <div class="spec-detail-panel" id="spec-detail-panel" style="display:none">
          <div id="spec-detail-header"></div>
          <div class="spec-runs" id="spec-runs"></div>
=======
          <p>Select a spec or run to view details</p>
>>>>>>> df-build/run_01KK/editor-and-build-mmhl1ta5
        </div>
        <!-- Spec Editor Panel -->
        <div class="spec-editor-panel" id="spec-editor-panel" style="display:none">
          <div class="spec-editor-header">
            <div class="spec-editor-title" id="spec-editor-title"></div>
            <div class="spec-editor-controls">
              <span class="locked-badge" id="locked-badge" style="display:none">Locked</span>
              <span class="spec-saved-indicator" id="spec-saved-indicator" style="display:none">Saved</span>
              <button class="spec-save-btn" id="spec-save-btn">Save</button>
              <button class="spec-build-btn" id="spec-build-btn">Build</button>
            </div>
          </div>
          <div class="locked-explanation" id="locked-explanation" style="display:none">This spec has a completed build. Create a new spec to make changes.</div>
          <div class="spec-editor-split">
            <div class="spec-editor-raw-container">
              <textarea class="spec-editor-raw" id="spec-editor-raw" placeholder="Spec markdown content..."></textarea>
            </div>
            <div class="spec-editor-preview" id="spec-editor-preview"></div>
          </div>
        </div>
        <!-- Run Detail Panel (existing) -->
        <div class="detail-panels" id="detail-panels" style="display:none">
          <div class="run-header" id="run-header"></div>
          <div class="phase-timeline" id="phases-container"></div>
          <div class="tab-bar" id="tab-bar">
            <button class="tab active" data-tab="overview">Overview</button>
            <button class="tab" data-tab="modules">Modules</button>
            <button class="tab" data-tab="validation">Validation</button>
          </div>
          <div class="tab-content" id="tab-content">
            <div class="tab-panel active" id="overview-panel">
              <div id="spec-goal-container"></div>
              <div id="architecture-container"></div>
              <div id="risks-container"></div>
              <div class="agents-collapsible collapsed" id="agents-collapsible">
                <div class="collapsible-header" id="agents-toggle">
                  <span class="collapsible-title">Agents</span>
                  <span class="collapsible-arrow">&#x25B6;</span>
                </div>
                <div class="collapsible-content" id="agents-container"></div>
              </div>
            </div>
            <div class="tab-panel" id="modules-panel">
              <h3 class="panel-title">Modules</h3>
              <div id="modules-container"></div>
            </div>
            <div class="tab-panel" id="validation-panel">
              <h3 class="panel-title">Validation</h3>
              <div id="validation-container"></div>
            </div>
          </div>
        </div>
      </section>
    </main>
    <!-- Create Spec Modal -->
    <div class="modal-overlay" id="create-spec-modal" style="display:none">
      <div class="modal-content">
        <h3>New Spec</h3>
        <p class="modal-description">Describe what to build in plain language:</p>
        <textarea class="spec-description-input" id="spec-description-input" rows="5" placeholder="e.g., Add a caching layer for the API responses"></textarea>
        <div class="modal-actions">
          <button class="modal-cancel" id="create-spec-cancel">Cancel</button>
          <button class="modal-submit" id="create-spec-submit">Create Spec</button>
        </div>
      </div>
    </div>
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

  /* --- Run Card Title (spec title as primary) --- */

  .run-card-title {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 2px;
    line-height: 1.3;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .run-card-phase {
    font-size: 11px;
    color: var(--text-muted);
    margin-bottom: 2px;
  }

  .run-card-progress {
    font-size: 11px;
    color: var(--text-secondary);
    font-family: var(--font-mono);
  }

  /* --- Collapsible Agents Section --- */

  .agents-collapsible {
    margin-top: 16px;
    border: 1px solid var(--border);
    border-radius: 6px;
    overflow: hidden;
  }

  .collapsible-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: var(--bg-secondary);
    cursor: pointer;
    user-select: none;
  }

  .collapsible-header:hover {
    background: var(--bg-tertiary);
  }

  .collapsible-title {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    color: var(--text-secondary);
  }

  .collapsible-arrow {
    font-size: 10px;
    color: var(--text-muted);
    transition: transform 0.2s;
  }

  .agents-collapsible.collapsed .collapsible-content {
    display: none;
  }

  .agents-collapsible:not(.collapsed) .collapsible-arrow {
    transform: rotate(90deg);
  }

  .collapsible-content {
    padding: 8px;
  }

  /* --- Architecture Summary --- */

  .arch-summary {
    padding: 12px;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 6px;
    margin-bottom: 12px;
  }

  .arch-summary h4 {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    margin-bottom: 8px;
  }

  .arch-flow {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--accent-blue);
    padding: 8px;
    background: var(--bg-tertiary);
    border-radius: 4px;
    overflow-x: auto;
  }

  .risk-card {
    padding: 8px 12px;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-left: 3px solid var(--accent-yellow);
    border-radius: 4px;
    margin-bottom: 6px;
    font-size: 12px;
  }

  .risk-description {
    color: var(--text-primary);
    margin-bottom: 4px;
  }

  .risk-mitigation {
    color: var(--text-muted);
    font-style: italic;
  }

  /* --- Spec Goal --- */

  .spec-goal {
    padding: 12px;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 6px;
    margin-bottom: 12px;
    font-size: 13px;
    color: var(--text-primary);
  }

  .spec-goal h4 {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    margin-bottom: 6px;
  }

  /* --- Validation --- */

  .scenario-card {
    padding: 10px 12px;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 6px;
    margin-bottom: 6px;
  }

  .scenario-card.passed {
    border-left: 3px solid var(--accent-green);
  }

  .scenario-card.failed {
    border-left: 3px solid var(--accent-red);
  }

  .scenario-name {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 4px;
  }

  .scenario-detail {
    font-size: 12px;
    color: var(--text-muted);
  }

<<<<<<< HEAD
  /* --- Spec Sidebar --- */
=======
  /* --- Sidebar Header with New Spec Button --- */
>>>>>>> df-build/run_01KK/editor-and-build-mmhl1ta5

  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
    padding: 0 4px;
  }

  .sidebar-header .section-title {
    margin-bottom: 0;
  }

  .new-spec-btn {
    padding: 4px 10px;
    font-size: 11px;
    font-weight: 500;
    color: var(--text-primary);
    background: var(--accent-blue);
    border: none;
    border-radius: 4px;
    cursor: pointer;
<<<<<<< HEAD
    transition: opacity 0.15s;
  }

  .new-spec-btn:hover {
    opacity: 0.85;
  }

  .spec-group {
    margin-bottom: 12px;
  }

  .spec-group-title {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    color: var(--text-muted);
    padding: 4px 4px;
    margin-bottom: 4px;
  }

  .spec-card {
    padding: 10px 12px;
=======
  }

  .new-spec-btn:hover {
    opacity: 0.9;
  }

  /* --- Spec Cards in Sidebar --- */

  .spec-group-title {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-muted);
    padding: 8px 4px 4px;
  }

  .spec-card {
    padding: 8px 12px;
>>>>>>> df-build/run_01KK/editor-and-build-mmhl1ta5
    border-radius: 6px;
    cursor: pointer;
    margin-bottom: 4px;
    border: 1px solid transparent;
    transition: background 0.15s, border-color 0.15s;
  }

  .spec-card:hover {
    background: var(--bg-tertiary);
  }

  .spec-card.active {
    background: var(--bg-tertiary);
    border-color: var(--accent-blue);
  }

<<<<<<< HEAD
  .spec-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
  }

=======
>>>>>>> df-build/run_01KK/editor-and-build-mmhl1ta5
  .spec-card-title {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 2px;
<<<<<<< HEAD
    line-height: 1.3;
=======
>>>>>>> df-build/run_01KK/editor-and-build-mmhl1ta5
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .spec-card-meta {
    display: flex;
<<<<<<< HEAD
    gap: 8px;
=======
    justify-content: space-between;
>>>>>>> df-build/run_01KK/editor-and-build-mmhl1ta5
    font-size: 11px;
    color: var(--text-secondary);
  }

<<<<<<< HEAD
  .spec-pass-rate {
    font-size: 11px;
    font-family: var(--font-mono);
    color: var(--accent-green);
  }

  .spec-detail-panel {
    padding: 0;
  }

  .spec-runs {
    margin-top: 12px;
  }

  .spec-runs h4 {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    margin-bottom: 8px;
  }

=======
  /* --- Spec Editor Panel --- */

  .spec-editor-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .spec-editor-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 0;
    margin-bottom: 8px;
    border-bottom: 1px solid var(--border);
  }

  .spec-editor-title {
    font-size: 18px;
    font-weight: 600;
  }

  .spec-editor-controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .locked-badge {
    padding: 2px 8px;
    font-size: 11px;
    font-weight: 600;
    color: var(--accent-yellow);
    background: rgba(210, 153, 34, 0.15);
    border-radius: 4px;
  }

  .spec-saved-indicator {
    font-size: 11px;
    color: var(--accent-green);
    font-weight: 500;
  }

  .spec-save-btn, .spec-build-btn {
    padding: 6px 14px;
    font-size: 12px;
    font-weight: 500;
    border: 1px solid var(--border);
    border-radius: 4px;
    cursor: pointer;
    background: var(--bg-secondary);
    color: var(--text-primary);
  }

  .spec-build-btn {
    background: var(--accent-green);
    color: #000;
    border: none;
  }

  .spec-build-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .locked-explanation {
    font-size: 12px;
    color: var(--text-muted);
    padding: 8px 0;
    font-style: italic;
  }

  .spec-editor-split {
    display: flex;
    flex: 1;
    gap: 12px;
    min-height: 400px;
  }

  .spec-editor-raw-container {
    flex: 1;
    display: flex;
  }

  .spec-editor-raw {
    flex: 1;
    padding: 12px;
    font-family: var(--font-mono);
    font-size: 13px;
    line-height: 1.6;
    color: var(--text-primary);
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 6px;
    resize: none;
  }

  .spec-editor-raw:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .spec-editor-preview {
    flex: 1;
    padding: 12px;
    font-size: 13px;
    line-height: 1.6;
    color: var(--text-primary);
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 6px;
    overflow-y: auto;
  }

  /* --- Modal --- */

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }

  .modal-content {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 24px;
    width: 500px;
    max-width: 90vw;
  }

  .modal-content h3 {
    font-size: 16px;
    margin-bottom: 8px;
  }

  .modal-description {
    font-size: 13px;
    color: var(--text-secondary);
    margin-bottom: 12px;
  }

  .spec-description-input {
    width: 100%;
    padding: 10px;
    font-family: var(--font-sans);
    font-size: 13px;
    color: var(--text-primary);
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: 4px;
    resize: vertical;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 16px;
  }

  .modal-cancel {
    padding: 6px 14px;
    font-size: 12px;
    background: var(--bg-tertiary);
    color: var(--text-primary);
    border: 1px solid var(--border);
    border-radius: 4px;
    cursor: pointer;
  }

  .modal-submit {
    padding: 6px 14px;
    font-size: 12px;
    background: var(--accent-blue);
    color: var(--text-primary);
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

>>>>>>> df-build/run_01KK/editor-and-build-mmhl1ta5
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
  let selectedSpecId = null;
  let refreshTimer = null;
  let autoSaveTimer = null;
  const REFRESH_INTERVAL = 5000;
  const AUTO_SAVE_DEBOUNCE = 3000;

  // Data-driven tab definitions — to add a new tab, add an entry here
  var TAB_DEFS = [
    { id: "overview", label: "Overview", panel: "overview-panel" },
    { id: "modules", label: "Modules", panel: "modules-panel" },
    { id: "validation", label: "Validation", panel: "validation-panel" }
  ];

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

<<<<<<< HEAD
  // --- Fetch and render specs list (sidebar) ---

  async function loadSpecs() {
    try {
      var data = await fetchJson("/api/specs");
      var specs = data.specs || data;
=======
  // --- Spec Management ---

  async function loadSpecs() {
    try {
      var specs = await fetchJson("/api/specs");
>>>>>>> df-build/run_01KK/editor-and-build-mmhl1ta5
      renderSpecsList(specs);
    } catch (err) {
      document.getElementById("specs-container").innerHTML =
        '<div class="loading">Error loading specs: ' + esc(err.message) + '</div>';
    }
  }

<<<<<<< HEAD
  var SPEC_STATUS_ORDER = ["building", "draft", "completed"];

  function renderSpecsList(specs) {
    var container = document.getElementById("specs-container");
    if (!specs || specs.length === 0) {
      container.innerHTML = '<div class="loading">No specs found</div>';
      return;
    }
    // Group by status
    var groups = {};
    SPEC_STATUS_ORDER.forEach(function(s) { groups[s] = []; });
    specs.forEach(function(spec) {
      var status = spec.status || "draft";
      if (!groups[status]) groups[status] = [];
      groups[status].push(spec);
    });
    var html = "";
    SPEC_STATUS_ORDER.forEach(function(status) {
      var list = groups[status];
      if (!list || list.length === 0) return;
      html += '<div class="spec-group">';
      html += '<div class="spec-group-title">' + esc(status) + ' (' + list.length + ')</div>';
      list.forEach(function(spec) {
        var isActive = spec.id === selectedSpecId ? " active" : "";
        var passRateHtml = spec.passRate
          ? '<span class="spec-pass-rate">' + esc(spec.passRate) + '</span>'
          : '';
        html += '<div class="spec-card' + isActive + '" data-spec-id="' + esc(spec.id) + '">'
          + '<div class="spec-card-header">'
          + statusBadge(spec.status)
          + passRateHtml
          + '</div>'
          + '<div class="spec-card-title" title="' + esc(spec.title) + '">' + esc(spec.title || spec.id) + '</div>'
          + '<div class="spec-card-meta">'
          + '<span>' + esc(spec.lastModified || "") + '</span>'
          + '</div>'
          + '</div>';
      });
      html += '</div>';
    });
=======
  function renderSpecsList(specs) {
    var container = document.getElementById("specs-container");
    if (!specs || specs.length === 0) {
      container.innerHTML = '<div class="loading">No specs yet</div>';
      return;
    }

    // Group by status: building, draft, completed
    var groups = { building: [], draft: [], completed: [] };
    specs.forEach(function(s) {
      var key = s.status || "draft";
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });

    var html = "";
    var groupOrder = ["building", "draft", "completed"];
    groupOrder.forEach(function(groupKey) {
      var groupSpecs = groups[groupKey];
      if (groupSpecs && groupSpecs.length > 0) {
        html += '<div class="spec-group-title">' + esc(groupKey) + '</div>';
        groupSpecs.forEach(function(s) {
          var isActive = s.id === selectedSpecId ? " active" : "";
          html += '<div class="spec-card' + isActive + '" data-spec-id="' + esc(s.id) + '">'
            + '<div class="spec-card-title">' + esc(s.title) + '</div>'
            + '<div class="spec-card-meta">'
            + statusBadge(s.status)
            + '<span>' + esc(s.lastModified || "") + '</span>'
            + '</div>'
            + '</div>';
        });
      }
    });

>>>>>>> df-build/run_01KK/editor-and-build-mmhl1ta5
    container.innerHTML = html;

    // Bind click events
    container.querySelectorAll(".spec-card").forEach(function(card) {
      card.addEventListener("click", function() {
        selectSpec(card.dataset.specId);
      });
    });
  }

<<<<<<< HEAD
  // --- Select spec and load detail ---

  async function selectSpec(specId) {
    selectedSpecId = specId;
    selectedRunId = null;
    document.getElementById("empty-state").style.display = "none";
    document.getElementById("detail-panels").style.display = "none";
    document.getElementById("spec-detail-panel").style.display = "block";

    // Highlight active card
    document.querySelectorAll(".spec-card").forEach(function(c) {
      c.classList.toggle("active", c.dataset.specId === specId);
    });

    try {
      var spec = await fetchJson("/api/specs/" + specId);
      renderSpecDetail(spec);
    } catch (err) {
      document.getElementById("spec-detail-header").innerHTML =
        '<div class="error-text">Error: ' + esc(err.message) + '</div>';
    }

    // Load runs for this spec
    try {
      var runsData = await fetchJson("/api/specs/" + specId + "/runs");
      var runs = runsData.runs || runsData;
      renderSpecRuns(runs);
    } catch (err) {
      document.getElementById("spec-runs").innerHTML = '';
    }
  }

  function renderSpecDetail(spec) {
    document.getElementById("spec-detail-header").innerHTML =
      '<div class="run-header">'
      + '<div class="run-header-title">'
      + '<h2>' + esc(spec.title || spec.id) + '</h2>'
      + statusBadge(spec.status)
      + '</div>'
      + '</div>';
  }

  function renderSpecRuns(runs) {
    var container = document.getElementById("spec-runs");
    if (!runs || runs.length === 0) {
      container.innerHTML = '<h4>Runs</h4><div class="loading">No runs for this spec</div>';
      return;
    }
    var html = '<h4>Runs</h4>';
    runs.forEach(function(run) {
      html += '<div class="run-card" data-run-id="' + esc(run.id) + '">'
        + '<div class="run-card-header">'
        + statusBadge(run.status)
        + '<span class="run-card-id">' + esc(run.id) + '</span>'
        + '</div>'
        + '<div class="run-card-meta">'
        + '<span>' + esc(run.phase || "") + '</span>'
        + (run.passRate ? '<span>' + esc(run.passRate) + '</span>' : '')
        + '<span>' + esc(run.createdAt || "") + '</span>'
        + '</div>'
        + '</div>';
    });
    container.innerHTML = html;

    // Bind click to navigate to run detail
    container.querySelectorAll(".run-card").forEach(function(card) {
      card.addEventListener("click", function() {
        selectRun(card.dataset.runId);
      });
    });
  }

  // --- Fetch and render runs list (kept for run detail navigation) ---
=======
  async function selectSpec(specId) {
    selectedSpecId = specId;
    selectedRunId = null;

    // Show editor, hide run detail
    document.getElementById("empty-state").style.display = "none";
    document.getElementById("detail-panels").style.display = "none";
    document.getElementById("spec-editor-panel").style.display = "flex";

    // Highlight active spec card
    document.querySelectorAll(".spec-card").forEach(function(c) {
      c.classList.toggle("active", c.dataset.specId === specId);
    });
    document.querySelectorAll(".run-card").forEach(function(c) {
      c.classList.remove("active");
    });

    try {
      var specData = await fetchJson("/api/specs/" + specId);
      renderSpecEditor(specData);
    } catch (err) {
      document.getElementById("spec-editor-raw").value = "Error loading spec: " + err.message;
    }
  }

  function renderSpecEditor(specData) {
    var titleEl = document.getElementById("spec-editor-title");
    var rawEl = document.getElementById("spec-editor-raw");
    var previewEl = document.getElementById("spec-editor-preview");
    var saveBtn = document.getElementById("spec-save-btn");
    var buildBtn = document.getElementById("spec-build-btn");
    var lockedBadge = document.getElementById("locked-badge");
    var lockedExplanation = document.getElementById("locked-explanation");

    titleEl.textContent = specData.title || specData.id;
    rawEl.value = specData.content || "";
    previewEl.innerHTML = renderMarkdownPreview(specData.content || "");

    var isCompleted = specData.status === "completed";
    var isBuilding = specData.status === "building";

    // Immutability guard
    rawEl.disabled = isCompleted;
    lockedBadge.style.display = isCompleted ? "inline-block" : "none";
    lockedExplanation.style.display = isCompleted ? "block" : "none";
    saveBtn.style.display = isCompleted ? "none" : "inline-block";
    buildBtn.disabled = isCompleted || isBuilding;
  }

  function renderMarkdownPreview(markdown) {
    // Simple markdown rendering (headers, bullets, paragraphs)
    return markdown.split("\\n").map(function(line) {
      if (line.match(/^### /)) return '<h3>' + esc(line.replace(/^### /, '')) + '</h3>';
      if (line.match(/^## /)) return '<h2>' + esc(line.replace(/^## /, '')) + '</h2>';
      if (line.match(/^# /)) return '<h1>' + esc(line.replace(/^# /, '')) + '</h1>';
      if (line.match(/^- /)) return '<li>' + esc(line.replace(/^- /, '')) + '</li>';
      if (line.trim() === '') return '<br>';
      return '<p>' + esc(line) + '</p>';
    }).join("");
  }

  // Auto-save debounce
  function debounce(fn, delay) {
    return function() {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = setTimeout(fn, delay);
    };
  }

  async function saveSpec() {
    if (!selectedSpecId) return;
    var rawEl = document.getElementById("spec-editor-raw");
    var content = rawEl.value;
    try {
      await fetch(apiBase + "/api/specs/" + selectedSpecId, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content })
      });
      var indicator = document.getElementById("spec-saved-indicator");
      indicator.style.display = "inline";
      setTimeout(function() { indicator.style.display = "none"; }, 2000);
      // Update preview
      document.getElementById("spec-editor-preview").innerHTML = renderMarkdownPreview(content);
    } catch (err) {
      console.error("Save failed:", err);
    }
  }

  async function createSpec() {
    var input = document.getElementById("spec-description-input");
    var description = input.value.trim();
    if (!description) return;

    try {
      var resp = await fetch(apiBase + "/api/specs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: description })
      });
      var data = await resp.json();
      if (resp.ok) {
        document.getElementById("create-spec-modal").style.display = "none";
        input.value = "";
        await loadSpecs();
        selectSpec(data.id);
      } else {
        alert("Error: " + (data.error || "Failed to create spec"));
      }
    } catch (err) {
      alert("Error creating spec: " + err.message);
    }
  }

  async function startBuild() {
    if (!selectedSpecId) return;
    var buildBtn = document.getElementById("spec-build-btn");
    buildBtn.disabled = true;
    buildBtn.textContent = "Building...";

    try {
      var resp = await fetch(apiBase + "/api/builds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specId: selectedSpecId })
      });
      var data = await resp.json();
      if (resp.ok) {
        await loadSpecs();
        await loadRuns();
        // Transition to run view
        if (data.runId) {
          selectRun(data.runId);
        }
      } else {
        alert("Build error: " + (data.error || "Failed to start build"));
        buildBtn.disabled = false;
        buildBtn.textContent = "Build";
      }
    } catch (err) {
      alert("Build error: " + err.message);
      buildBtn.disabled = false;
      buildBtn.textContent = "Build";
    }
  }

  // --- Wire up spec editor events ---

  document.getElementById("new-spec-btn").addEventListener("click", function() {
    document.getElementById("create-spec-modal").style.display = "flex";
    document.getElementById("spec-description-input").focus();
  });

  document.getElementById("create-spec-cancel").addEventListener("click", function() {
    document.getElementById("create-spec-modal").style.display = "none";
  });

  document.getElementById("create-spec-submit").addEventListener("click", function() {
    createSpec();
  });

  document.getElementById("spec-save-btn").addEventListener("click", function() {
    saveSpec();
  });

  document.getElementById("spec-build-btn").addEventListener("click", function() {
    startBuild();
  });

  // Auto-save on editor change with debounce
  document.getElementById("spec-editor-raw").addEventListener("input", debounce(function() {
    saveSpec();
  }, AUTO_SAVE_DEBOUNCE));

  // --- Fetch and render runs list ---
>>>>>>> df-build/run_01KK/editor-and-build-mmhl1ta5

  async function loadRuns() {
    try {
      const runs = await fetchJson("/api/runs");
      renderRunsList(runs);
    } catch (err) {
      // Runs list is no longer primary sidebar, errors handled silently
    }
  }

  // Phase label mapping for sidebar
  var PHASE_LABEL_MAP = {
    "scout": "Scout",
    "architect": "Architect",
    "plan-review": "Plan Review",
    "build": "Build",
    "integrate": "Integrate",
    "evaluate-functional": "Evaluate",
    "evaluate-change": "Change Eval",
    "merge": "Merge"
  };

  function friendlyPhase(phase) {
    return PHASE_LABEL_MAP[phase] || phase || "—";
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
        + statusBadge(run.status)
        + '<span class="run-card-id" title="' + esc(run.id) + '">' + esc(run.elapsed) + '</span>'
        + '</div>'
        + '<div class="run-card-title" title="' + esc(run.specId) + '">' + esc(run.specTitle || run.specId) + '</div>'
        + '<div class="run-card-phase">' + friendlyPhase(run.phase) + '</div>'
        + '<div class="run-card-progress">' + esc(run.completedCount) + '/' + esc(run.moduleCount) + ' modules</div>'
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
    selectedSpecId = null;
    document.getElementById("empty-state").style.display = "none";
    document.getElementById("spec-editor-panel").style.display = "none";
    document.getElementById("detail-panels").style.display = "block";
    var specPanel = document.getElementById("spec-detail-panel");
    if (specPanel) specPanel.style.display = "none";

    // Highlight active card
    document.querySelectorAll(".run-card").forEach(function(c) {
      c.classList.toggle("active", c.dataset.runId === runId);
    });

    await Promise.all([
      loadRunDetail(runId, true),
      loadAgents(runId, true),
      loadModules(runId, true),
      loadPhases(runId, true),
      loadOverview(runId, true),
      loadValidation(runId, true)
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
      + '<h2>' + esc(run.specTitle || run.specId) + '</h2>'
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

  function agentStatusIcon(status) {
    if (status === "running") return '<span class="agent-spinner"></span>';
    if (status === "spawning") return '<span class="agent-spinner spawning"></span>';
    if (status === "completed") return '<span class="agent-status-icon completed">\u2713</span>';
    if (status === "failed") return '<span class="agent-status-icon failed">\u2717</span>';
    if (status === "killed") return '<span class="agent-status-icon killed">\u2717</span>';
    return '<span class="agent-status-indicator ' + esc(status || "pending") + '"></span>';
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

  // --- Overview (spec goal, architecture, risks) ---

  async function loadOverview(runId, showSpinner) {
    var goalContainer = document.getElementById("spec-goal-container");
    var archContainer = document.getElementById("architecture-container");
    var riskContainer = document.getElementById("risks-container");

    if (showSpinner) {
      goalContainer.innerHTML = '<div class="loading-spinner">Loading spec\u2026</div>';
    }

    // Load spec content
    try {
      var specData = await fetchJson("/api/runs/" + runId + "/spec");
      goalContainer.innerHTML = '<div class="spec-goal"><h4>Spec Goal</h4><p>' + esc(specData.title || "—") + '</p></div>';
    } catch (err) {
      goalContainer.innerHTML = '';
    }

    // Load buildplan for architecture + risks
    try {
      var bp = await fetchJson("/api/runs/" + runId + "/buildplan");
      // Render architecture summary
      if (bp.modules && bp.modules.length > 0) {
        var flow = bp.modules.map(function(m) { return esc(m.title || m.id); }).join(' \u2192 ');
        archContainer.innerHTML = '<div class="arch-summary"><h4>Architecture</h4>'
          + '<div class="arch-flow">' + flow + '</div></div>';
      } else {
        archContainer.innerHTML = '';
      }
      // Render risks
      if (bp.risks && bp.risks.length > 0) {
        riskContainer.innerHTML = bp.risks.map(function(r) {
          return '<div class="risk-card">'
            + '<div class="risk-description">\u26A0 ' + esc(r.description) + '</div>'
            + (r.mitigation ? '<div class="risk-mitigation">Mitigation: ' + esc(r.mitigation) + '</div>' : '')
            + '</div>';
        }).join('');
      } else {
        riskContainer.innerHTML = '';
      }
    } catch (err) {
      archContainer.innerHTML = '';
      riskContainer.innerHTML = '';
    }
  }

  // --- Validation (scenarios) ---

  async function loadValidation(runId, showSpinner) {
    var container = document.getElementById("validation-container");
    if (showSpinner) {
      container.innerHTML = '<div class="loading-spinner">Loading scenarios\u2026</div>';
    }
    try {
      var scenarios = await fetchJson("/api/runs/" + runId + "/scenarios");
      renderValidation(scenarios);
    } catch (err) {
      container.innerHTML = '<div class="error-text">Error: ' + esc(err.message) + '</div>';
    }
  }

  function renderValidation(scenarios) {
    var container = document.getElementById("validation-container");
    if (!scenarios || scenarios.length === 0) {
      container.innerHTML = '<div class="loading">No validation results yet</div>';
      return;
    }
    container.innerHTML = scenarios.map(function(s) {
      var isPassed = s.type === "evaluation-passed";
      var statusClass = isPassed ? "passed" : "failed";
      var icon = isPassed ? "\u2713" : "\u2717";
      var name = (s.data && s.data.scenario) || s.type;
      var detail = (s.data && s.data.description) || "";
      var errorMsg = (s.data && s.data.error) || "";
      return '<div class="scenario-card ' + statusClass + '">'
        + '<div class="scenario-name">' + icon + ' ' + esc(name) + '</div>'
        + (detail ? '<div class="scenario-detail">' + esc(detail) + '</div>' : '')
        + (errorMsg ? '<div class="error-text">' + esc(errorMsg) + '</div>' : '')
        + '</div>';
    }).join('');
  }

  // --- Collapsible agents toggle ---

  document.getElementById("agents-toggle").addEventListener("click", function() {
    var section = document.getElementById("agents-collapsible");
    section.classList.toggle("collapsed");
  });

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
    await loadSpecs();
<<<<<<< HEAD
=======
    await loadRuns();
>>>>>>> df-build/run_01KK/editor-and-build-mmhl1ta5
    if (selectedRunId) {
      await Promise.all([
        loadRunDetail(selectedRunId, false),
        loadAgents(selectedRunId, false),
        loadModules(selectedRunId, false),
        loadPhases(selectedRunId, false),
        loadOverview(selectedRunId, false),
        loadValidation(selectedRunId, false)
      ]);
    }
  }

  // Initial load
  loadSpecs().catch(function(err) {
<<<<<<< HEAD
=======
    console.error("Initial specs load failed:", err);
  });
  loadRuns().catch(function(err) {
>>>>>>> df-build/run_01KK/editor-and-build-mmhl1ta5
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
