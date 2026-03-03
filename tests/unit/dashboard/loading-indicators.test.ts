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
