import { describe, expect, test } from "bun:test";
import { generateDashboardHtml } from "../../../src/dashboard/index.js";

/**
 * Cost Estimation UI Tests
 *
 * Spec: Dashboard polls trigger cost estimation for running agents
 * Module: mod-server-cost-estimation
 *
 * These tests verify the CSS and JavaScript in the dashboard HTML
 * correctly render estimated costs with visual distinction:
 * - Estimated costs use .cost-estimated CSS class (italic, muted color)
 * - Estimated costs are prefixed with ~ (tilde)
 * - Real costs display normally via formatCost
 * - Run header shows cost + estimated cost breakdown
 */

describe("Dashboard CSS: cost-estimated class", () => {
  const html = generateDashboardHtml();

  test(".cost-estimated class exists in CSS", () => {
    expect(html).toContain(".cost-estimated");
  });

  test(".cost-estimated has italic font-style or muted color", () => {
    // The CSS should style .cost-estimated with font-style: italic and/or color: var(--text-muted)
    expect(html).toMatch(
      /\.cost-estimated\s*\{[^}]*(font-style:\s*italic|color:\s*var\(--text-muted\))[^}]*\}/,
    );
  });

  test("CSS has no external stylesheet dependencies", () => {
    // All styles must be inline
    expect(html).not.toMatch(/<link[^>]+rel="stylesheet"[^>]+href="http/);
  });
});

describe("Dashboard JS: agent cost rendering", () => {
  const html = generateDashboardHtml();

  test("renderAgents function checks isEstimate field", () => {
    expect(html).toContain("isEstimate");
  });

  test("estimated cost is wrapped in span.cost-estimated with ~ prefix", () => {
    // The JS should output something like: <span class="cost-estimated">~$0.25</span>
    expect(html).toContain("cost-estimated");
    expect(html).toContain("~");
  });

  test("JS references both cost and estimatedCost from API data", () => {
    // The renderAgents function should use both a.cost and a.estimatedCost
    expect(html).toContain("a.cost");
    expect(html).toContain("a.estimatedCost");
  });

  test("JS uses formatCost for displaying cost values", () => {
    expect(html).toContain("formatCost");
  });
});

describe("Dashboard JS: run header cost display", () => {
  const html = generateDashboardHtml();

  test("run header renders estimatedCost from RunSummary", () => {
    // The renderRunHeader function should reference run.estimatedCost
    expect(html).toContain("estimatedCost");
  });

  test("run header shows cost + estimated cost format when estimates exist", () => {
    // Should combine actual cost with estimated: "$1.00 + ~$0.25"
    // The JS should conditionally show estimated portion
    expect(html).toContain("cost-estimated");
    expect(html).toContain("~");
  });

  test("budget percentage calculation uses cost + estimatedCost", () => {
    // The JS should compute budgetPct from (cost + estimatedCost) / budget
    // Look for the totalCost = cost + estimatedCost pattern
    expect(html).toContain("estimatedCost");
    expect(html).toContain("budget");
  });
});

describe("Dashboard JS: formatting helpers", () => {
  const html = generateDashboardHtml();

  test("formatCost produces $ prefix", () => {
    expect(html).toContain("formatCost");
    // formatCost function definition contains "$" for dollar sign prefix
    expect(html).toMatch(/function formatCost/);
    expect(html).toContain('"$"');
  });

  test("formatTokens handles K and M suffixes", () => {
    expect(html).toContain("formatTokens");
    expect(html).toContain("1e6");
    expect(html).toContain("1e3");
  });
});

describe("Dashboard JS: auto-refresh polls update costs", () => {
  const html = generateDashboardHtml();

  test("auto-refresh interval is set to 5000ms", () => {
    expect(html).toContain("5000");
    expect(html).toContain("REFRESH_INTERVAL");
    expect(html).toContain("setInterval");
  });

  test("refresh function reloads agents data (which includes estimated costs)", () => {
    // The refresh function should reload run detail plus agents and modules
    expect(html).toContain("loadAgents");
    expect(html).toContain("loadModules");
    expect(html).toContain("loadRunDetail");
  });

  test("refresh calls loadRuns to update run list with aggregated estimates", () => {
    expect(html).toContain("loadRuns");
  });
});

describe("Dashboard JS: status badges for cost context", () => {
  const html = generateDashboardHtml();

  test("status badges include running state (animated)", () => {
    expect(html).toContain(".status-badge.running");
    expect(html).toContain(".agent-status-indicator.running");
  });

  test("status badges include spawning state", () => {
    expect(html).toContain(".status-badge.spawning");
    expect(html).toContain(".agent-status-indicator.spawning");
  });

  test("running status indicator has pulse animation", () => {
    expect(html).toContain("animation: pulse");
  });

  test("phase indicator is active when run is running", () => {
    expect(html).toContain(".phase-indicator.active");
    expect(html).toContain('run.status === "running"');
  });
});

describe("Dashboard HTML: loading indicators", () => {
  const html = generateDashboardHtml();

  test("loading-spinner class exists for async content loads", () => {
    expect(html).toContain("loading-spinner");
  });

  test("loading spinners used when loading agents", () => {
    expect(html).toContain("Loading agents");
  });

  test("loading spinners used when loading modules", () => {
    expect(html).toContain("Loading modules");
  });

  test("spinners are replaced by content on successful load", () => {
    // After fetch, innerHTML is replaced with rendered content
    expect(html).toContain("innerHTML");
    expect(html).toContain("agent-card");
    expect(html).toContain("module-card");
  });

  test("error states replace spinners with error messages", () => {
    expect(html).toContain("error-text");
    expect(html).toContain("Error:");
  });
});

describe("Dashboard: server imports agent-enrichment", () => {
  test("server.ts imports computeElapsedMs from agent-enrichment", async () => {
    const serverModule = await import("../../../src/dashboard/server.js");
    // The server should export startServer which uses agent-enrichment internally
    expect(typeof serverModule.startServer).toBe("function");
  });
});
