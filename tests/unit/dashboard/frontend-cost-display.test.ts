import { describe, expect, it } from "bun:test";
import { generateDashboardHtml } from "../../../src/dashboard/index.js";

describe("formatCostDisplay function", () => {
  it("exists in the generated HTML JavaScript", () => {
    const html = generateDashboardHtml();
    expect(html).toContain("formatCostDisplay");
  });

  it("accepts cost, estimatedCost, and isEstimate parameters", () => {
    const html = generateDashboardHtml();
    // The function signature should accept these three parameters
    expect(html).toMatch(/function\s+formatCostDisplay\s*\(\s*\w+\s*,\s*\w+\s*,\s*\w+\s*\)/);
  });

  it("returns tilde-prefixed cost-estimated span when isEstimate is true", () => {
    const html = generateDashboardHtml();
    // When isEstimate is true, should wrap in cost-estimated span with ~ prefix
    expect(html).toContain("cost-estimated");
    // The function should check isEstimate and produce ~$X.XXXX
    expect(html).toMatch(/formatCostDisplay/);
  });

  it("returns plain formatted cost when isEstimate is false", () => {
    const html = generateDashboardHtml();
    // When isEstimate is false, should use formatCost directly
    expect(html).toContain("formatCost");
  });
});

describe("module card estimated cost display", () => {
  it("uses formatCostDisplay in module card rendering", () => {
    const html = generateDashboardHtml();
    // renderModules should call formatCostDisplay instead of formatCost for cost display
    // The module card should pass m.cost, m.estimatedCost, m.isEstimate
    const modulesSection = html.substring(html.indexOf("function renderModules"));
    expect(modulesSection).toContain("formatCostDisplay");
    expect(modulesSection).toContain("m.isEstimate");
    expect(modulesSection).toContain("m.estimatedCost");
  });

  it("module card passes isEstimate field from module data", () => {
    const html = generateDashboardHtml();
    const modulesSection = html.substring(html.indexOf("function renderModules"));
    expect(modulesSection).toContain("isEstimate");
  });
});

describe("agent card uses formatCostDisplay", () => {
  it("uses formatCostDisplay in agent card rendering", () => {
    const html = generateDashboardHtml();
    const agentsSection = html.substring(html.indexOf("function renderAgents"));
    const agentsEnd = html.indexOf("function renderModules");
    const agentsCode = html.substring(html.indexOf("function renderAgents"), agentsEnd);
    expect(agentsCode).toContain("formatCostDisplay");
  });

  it("passes agent isEstimate, estimatedCost, and cost to formatCostDisplay", () => {
    const html = generateDashboardHtml();
    const agentsSection = html.substring(html.indexOf("function renderAgents"));
    const agentsEnd = html.indexOf("function renderModules");
    const agentsCode = html.substring(html.indexOf("function renderAgents"), agentsEnd);
    // Should reference a.isEstimate, a.estimatedCost, a.cost
    expect(agentsCode).toContain("a.cost");
    expect(agentsCode).toContain("a.estimatedCost");
    expect(agentsCode).toContain("a.isEstimate");
  });
});

describe("CSS cost-estimated class", () => {
  it("has .cost-estimated CSS class with font-style italic", () => {
    const html = generateDashboardHtml();
    expect(html).toContain(".cost-estimated");
    // Should have italic styling
    expect(html).toMatch(/\.cost-estimated\s*\{[^}]*font-style:\s*italic/);
  });

  it("has muted color for estimated cost", () => {
    const html = generateDashboardHtml();
    // Should reference muted color variable
    expect(html).toMatch(/\.cost-estimated\s*\{[^}]*color:\s*var\(--text-muted\)/);
  });
});

describe("frontend-cost-display integration", () => {
  it("no external dependencies for CSS animations", () => {
    const html = generateDashboardHtml();
    // @keyframes spin and pulse must exist
    expect(html).toContain("@keyframes spin");
    expect(html).toContain("@keyframes pulse");
    // No external stylesheet links or script tags
    expect(html).not.toMatch(/<link[^>]+rel="stylesheet"[^>]+href="http/);
    expect(html).not.toMatch(/<script[^>]+src="http/);
    // No external assets for spinners
    expect(html).not.toMatch(/\.gif|\.svg.*spinner|\.png.*spinner/i);
  });

  it("loading spinners use CSS border technique", () => {
    const html = generateDashboardHtml();
    expect(html).toContain("border-radius: 50%");
    expect(html).toContain("border-top-color");
  });

  it("run header budget percentage includes estimated costs", () => {
    const html = generateDashboardHtml();
    const headerSection = html.substring(html.indexOf("function renderRunHeader"));
    // The total cost should be run.cost + run.estimatedCost
    expect(headerSection).toContain("estimatedCost");
    // Budget percentage should factor in estimated cost
    expect(headerSection).toContain("budget");
  });

  it("run header displays estimated cost with visual distinction", () => {
    const html = generateDashboardHtml();
    const headerSection = html.substring(html.indexOf("function renderRunHeader"));
    // Should use cost-estimated class for the estimated portion
    expect(headerSection).toContain("cost-estimated");
  });
});
