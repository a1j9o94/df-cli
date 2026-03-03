import { describe, expect, it } from "bun:test";
import { generateDashboardHtml } from "../../../src/dashboard/index.js";

describe("Loading Spinner CSS", () => {
  const html = generateDashboardHtml();

  it("contains loading-spinner CSS class with animation", () => {
    expect(html).toContain(".loading-spinner");
  });

  it("contains @keyframes spin animation", () => {
    expect(html).toContain("@keyframes spin");
  });

  it("loading-spinner uses CSS animation (not just static text)", () => {
    // The ::before pseudo-element has the spinning animation
    expect(html).toContain("animation: spin");
  });

  it("spin animation rotates 360 degrees", () => {
    expect(html).toContain("rotate(360deg)");
  });
});

describe("Loading Spinner JS - Agents Panel", () => {
  const html = generateDashboardHtml();

  it("shows loading spinner before fetching agents", () => {
    expect(html).toContain("loading-spinner");
    expect(html).toMatch(/Loading agents/);
  });

  it("sets loading state before fetchJson call for agents", () => {
    // The JS should set innerHTML to a spinner BEFORE the fetch call
    // loading-spinner appears before fetchJson(/agents)
    const spinnerIdx = html.indexOf('loading-spinner">Loading agents');
    const fetchIdx = html.indexOf('fetchJson("/api/runs/" + runId + "/agents")');
    expect(spinnerIdx).toBeGreaterThan(-1);
    expect(fetchIdx).toBeGreaterThan(-1);
    expect(spinnerIdx).toBeLessThan(fetchIdx);
  });
});

describe("Loading Spinner JS - Modules Panel", () => {
  const html = generateDashboardHtml();

  it("shows loading spinner before fetching modules", () => {
    expect(html).toContain("loading-spinner");
    expect(html).toMatch(/Loading modules/);
  });

  it("sets loading state before fetchJson call for modules", () => {
    const spinnerIdx = html.indexOf('loading-spinner">Loading modules');
    const fetchIdx = html.indexOf('fetchJson("/api/runs/" + runId + "/modules")');
    expect(spinnerIdx).toBeGreaterThan(-1);
    expect(fetchIdx).toBeGreaterThan(-1);
    expect(spinnerIdx).toBeLessThan(fetchIdx);
  });
});

describe("Agent Status Animated Indicators", () => {
  const html = generateDashboardHtml();

  it("contains agent-status-indicator CSS class", () => {
    expect(html).toContain(".agent-status-indicator");
  });

  it("running agents have animated pulse indicator", () => {
    expect(html).toContain(".agent-status-indicator.running");
    // Check that running has animation
    expect(html).toMatch(/\.agent-status-indicator\.running\s*\{[^}]*animation:\s*pulse/);
  });

  it("spawning agents have animated pulse indicator", () => {
    expect(html).toContain(".agent-status-indicator.spawning");
    expect(html).toMatch(/\.agent-status-indicator\.spawning\s*\{[^}]*animation:\s*pulse/);
  });

  it("completed agents have static indicator (no animation)", () => {
    expect(html).toContain(".agent-status-indicator.completed");
    // completed should NOT have animation
    const completedMatch = html.match(/\.agent-status-indicator\.completed\s*\{([^}]*)\}/);
    expect(completedMatch).toBeTruthy();
    expect(completedMatch![1]).not.toContain("animation");
  });

  it("failed agents have static indicator (no animation)", () => {
    expect(html).toContain(".agent-status-indicator.failed");
    const failedMatch = html.match(/\.agent-status-indicator\.failed\s*\{([^}]*)\}/);
    expect(failedMatch).toBeTruthy();
    expect(failedMatch![1]).not.toContain("animation");
  });

  it("killed agents have static indicator (no animation)", () => {
    expect(html).toContain(".agent-status-indicator.killed");
    const killedMatch = html.match(/\.agent-status-indicator\.killed\s*\{([^}]*)\}/);
    expect(killedMatch).toBeTruthy();
    expect(killedMatch![1]).not.toContain("animation");
  });

  it("renderAgents JS adds agent-status-indicator with status class", () => {
    // The JS should add <span class="agent-status-indicator <status>"> in renderAgents
    expect(html).toContain("agent-status-indicator");
    expect(html).toContain("statusClass");
  });

  it("@keyframes pulse is defined for agent indicators", () => {
    expect(html).toContain("@keyframes pulse");
  });
});

describe("Phase Indicator in Run Header", () => {
  const html = generateDashboardHtml();

  it("contains phase-indicator CSS class", () => {
    expect(html).toContain(".phase-indicator");
  });

  it("active phase indicator has animation", () => {
    expect(html).toContain(".phase-indicator.active");
    expect(html).toMatch(/\.phase-indicator\.active\s*\{[^}]*animation:\s*pulse/);
  });

  it("renderRunHeader adds phase-indicator with active class when running", () => {
    // The JS should conditionally add 'active' class when run.status === 'running'
    expect(html).toContain("phase-indicator");
    expect(html).toMatch(/run\.status\s*===\s*["']running["']\s*\?\s*["']\s*active["']/);
  });

  it("phase indicator is distinct from auto-refresh pulse", () => {
    // phase-indicator should be a separate element with its own styling
    expect(html).toContain(".phase-indicator");
    expect(html).toContain(".auto-refresh-indicator");
    // They should be different classes
    expect(".phase-indicator").not.toBe(".auto-refresh-indicator");
  });
});

describe("Estimated Cost Display", () => {
  const html = generateDashboardHtml();

  it("contains cost-estimated CSS class", () => {
    expect(html).toContain(".cost-estimated");
  });

  it("cost-estimated has distinct styling", () => {
    // Should have different styling (italic, muted color, etc.)
    expect(html).toMatch(/\.cost-estimated\s*\{[^}]*(font-style|color|opacity)/);
  });

  it("JS checks isEstimate condition for agents", () => {
    // The JS should check cost and estimatedCost to decide display format
    expect(html).toContain("isEstimate");
    expect(html).toContain("estimatedCost");
  });

  it("estimated costs display with tilde prefix", () => {
    // The JS should prepend '~' for estimated costs
    expect(html).toContain("cost-estimated");
    expect(html).toMatch(/~.*formatCost/);
  });
});

describe("Run Card Sidebar Pulse for Active Runs", () => {
  const html = generateDashboardHtml();

  it("contains CSS for run-card.alive animation", () => {
    expect(html).toContain(".run-card.alive");
  });

  it("run-card.alive has a subtle CSS animation", () => {
    expect(html).toMatch(/\.run-card\.alive\s*\{[^}]*animation/);
  });

  it("defines @keyframes glow-pulse for sidebar cards", () => {
    expect(html).toContain("@keyframes glow-pulse");
  });

  it("renderRunsList JS adds alive class to running run cards", () => {
    // The JS should check run.status === 'running' and add 'alive' class
    expect(html).toMatch(/run\.status\s*===\s*["']running["']/);
    expect(html).toContain("alive");
  });

  it("non-running run cards do not get alive class", () => {
    // The alive class should only be added conditionally for running status
    const renderSection = html.substring(html.indexOf("function renderRunsList"));
    expect(renderSection).toMatch(/status\s*===\s*["']running["']\s*\?\s*["']\s*alive["']/);
  });
});

describe("No Animation on Completed Runs", () => {
  const html = generateDashboardHtml();

  it("completed run cards do not get alive class", () => {
    // Only running status should get the alive class
    const renderSection = html.substring(html.indexOf("function renderRunsList"));
    // The alive conditional should check specifically for 'running'
    expect(renderSection).toMatch(/status\s*===\s*["']running["']/);
    // It should not match 'completed' or 'failed' for alive
    expect(renderSection).not.toMatch(/status\s*===\s*["']completed["'].*alive/);
  });
});

describe("Module Card Estimated Cost Display", () => {
  const html = generateDashboardHtml();

  it("renderModules JS checks isEstimate for module cost display", () => {
    const renderModulesSection = html.substring(html.indexOf("function renderModules"));
    expect(renderModulesSection).toContain("isEstimate");
    expect(renderModulesSection).toContain("estimatedCost");
  });

  it("module card shows estimated cost with tilde prefix and cost-estimated class", () => {
    const renderModulesSection = html.substring(html.indexOf("function renderModules"));
    // Should use cost-estimated class for estimated costs
    expect(renderModulesSection).toContain("cost-estimated");
    // Should prefix with ~
    expect(renderModulesSection).toMatch(/~.*formatCost/);
  });

  it("module card shows actual cost normally when not estimated", () => {
    const renderModulesSection = html.substring(html.indexOf("function renderModules"));
    // Should still use formatCost for non-estimated cost
    expect(renderModulesSection).toContain("formatCost");
  });
});

describe("Loading indicators are CSS-only (no external deps)", () => {
  const html = generateDashboardHtml();

  it("all animations use @keyframes CSS rules", () => {
    expect(html).toContain("@keyframes spin");
    expect(html).toContain("@keyframes pulse");
  });

  it("no requestAnimationFrame used for loading indicators", () => {
    // Loading indicators should be CSS-only
    expect(html).not.toContain("requestAnimationFrame");
  });

  it("no external assets referenced for spinners", () => {
    // Should not reference external images/SVGs for spinners
    expect(html).not.toMatch(/spinner.*\.(gif|svg|png)/);
  });
});

describe("Loading Spinner JS - Run Header", () => {
  const html = generateDashboardHtml();

  it("shows loading spinner before fetching run detail", () => {
    // loadRunDetail should set a loading-spinner innerHTML on run-header before fetching
    const loadRunDetailSection = html.substring(html.indexOf("function loadRunDetail"));
    expect(loadRunDetailSection).toContain("loading-spinner");
    expect(loadRunDetailSection).toMatch(/Loading run detail|Loading run\b(?!s)/);
  });

  it("sets loading state before fetchJson call for run detail", () => {
    // Within loadRunDetail, the loading spinner must be set BEFORE the fetchJson call
    const fnStart = html.indexOf("function loadRunDetail");
    const section = html.substring(fnStart);
    const spinnerIdx = section.indexOf("loading-spinner");
    const fetchIdx = section.indexOf("fetchJson");
    expect(spinnerIdx).toBeGreaterThan(-1);
    expect(fetchIdx).toBeGreaterThan(-1);
    expect(spinnerIdx).toBeLessThan(fetchIdx);
  });

  it("run header loading spinner is cleared when data arrives", () => {
    expect(html).toContain("renderRunHeader(run)");
  });

  it("run header loading spinner is cleared on error", () => {
    // The run header error handler sets innerHTML
    const runHeaderSection = html.substring(html.indexOf("loadRunDetail"));
    expect(runHeaderSection).toContain("error-text");
  });
});

describe("Auto-refresh suppresses loading spinners", () => {
  const html = generateDashboardHtml();

  it("refresh function does not show loading spinners on auto-refresh", () => {
    // The refresh() function should call load functions without showing spinners
    // This can be achieved by passing a skipSpinner parameter, using separate functions,
    // or checking if container already has content
    const refreshSection = html.substring(html.indexOf("async function refresh"));
    // The refresh path should NOT trigger loading-spinner display
    // It should either pass a flag or use a different pattern
    expect(refreshSection).toMatch(/skipSpinner|isRefresh|silent|false/);
  });

  it("loadAgents accepts a parameter to skip spinner on refresh", () => {
    // loadAgents should accept a parameter to control spinner display
    const fnDef = html.match(/function loadAgents\([^)]*\)/);
    expect(fnDef).toBeTruthy();
    // Should accept more than just runId
    expect(fnDef![0]).toMatch(/function loadAgents\(\s*runId\s*,/);
  });

  it("loadModules accepts a parameter to skip spinner on refresh", () => {
    const fnDef = html.match(/function loadModules\([^)]*\)/);
    expect(fnDef).toBeTruthy();
    expect(fnDef![0]).toMatch(/function loadModules\(\s*runId\s*,/);
  });

  it("loadRunDetail accepts a parameter to skip spinner on refresh", () => {
    const fnDef = html.match(/function loadRunDetail\([^)]*\)/);
    expect(fnDef).toBeTruthy();
    expect(fnDef![0]).toMatch(/function loadRunDetail\(\s*runId\s*,/);
  });

  it("refresh passes skip-spinner flag to load functions", () => {
    const refreshSection = html.substring(html.indexOf("async function refresh"));
    const refreshEnd = refreshSection.indexOf("}\n");
    const refreshBody = refreshSection.substring(0, refreshEnd);
    // The refresh function should pass false/true to indicate skip spinner
    expect(refreshBody).toMatch(/loadRunDetail\(selectedRunId\s*,\s*false\)/);
    expect(refreshBody).toMatch(/loadAgents\(selectedRunId\s*,\s*false\)/);
    expect(refreshBody).toMatch(/loadModules\(selectedRunId\s*,\s*false\)/);
  });

  it("selectRun passes show-spinner flag to load functions", () => {
    const selectRunSection = html.substring(html.indexOf("async function selectRun"));
    // selectRun should pass true for showing spinners (initial load)
    expect(selectRunSection).toMatch(/loadRunDetail\(runId\s*,\s*true\)/);
    expect(selectRunSection).toMatch(/loadAgents\(runId\s*,\s*true\)/);
    expect(selectRunSection).toMatch(/loadModules\(runId\s*,\s*true\)/);
  });
});

describe("Loading clears on success and error", () => {
  const html = generateDashboardHtml();

  it("agents loading spinner is cleared when data arrives", () => {
    // renderAgents replaces innerHTML, clearing the spinner
    expect(html).toContain("renderAgents(agents)");
  });

  it("agents loading spinner is cleared on error", () => {
    // On error, container.innerHTML is set to error text
    expect(html).toMatch(/container\.innerHTML\s*=\s*[^;]*error-text/);
  });

  it("modules loading spinner is cleared when data arrives", () => {
    expect(html).toContain("renderModules(modules)");
  });

  it("modules loading spinner is cleared on error", () => {
    // The modules error handler also sets innerHTML
    const modulesSection = html.substring(html.indexOf("loadModules"));
    expect(modulesSection).toContain("error-text");
  });
});
