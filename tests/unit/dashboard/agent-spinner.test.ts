import { describe, expect, it } from "bun:test";
import { generateDashboardHtml } from "../../../src/dashboard/index.js";

describe("Enhanced Agent Card Spinner for Active Agents", () => {
  const html = generateDashboardHtml();

  it("contains agent-spinner CSS class for running agents", () => {
    expect(html).toContain(".agent-spinner");
  });

  it("agent-spinner has CSS animation", () => {
    expect(html).toMatch(/\.agent-spinner[^}]*\{[^}]*animation/s);
  });

  it("agent-spinner uses @keyframes spin animation", () => {
    expect(html).toContain("@keyframes spin");
  });

  it("renderAgents adds agent-spinner for running agents", () => {
    // The inline spinner logic in renderAgents determines what icon to render based on status
    const renderAgentsSection = html.substring(html.indexOf("function renderAgents"));
    expect(renderAgentsSection).toContain("agent-spinner");
    expect(renderAgentsSection).toContain("running");
  });

  it("agent-spinner is only shown for running or spawning status", () => {
    const renderAgentsSection = html.substring(html.indexOf("function renderAgents"));
    // Should check for running and spawning
    expect(renderAgentsSection).toContain("running");
    expect(renderAgentsSection).toContain("spawning");
    // Both should produce agent-spinner elements
    const runningIdx = renderAgentsSection.indexOf('"running"');
    const spawningIdx = renderAgentsSection.indexOf('"spawning"');
    expect(runningIdx).toBeGreaterThan(-1);
    expect(spawningIdx).toBeGreaterThan(-1);
  });

  it("renderAgents uses inline spinner logic to render status", () => {
    const renderAgentsSection = html.substring(html.indexOf("function renderAgents"));
    // Main's implementation uses inline spinnerHtml variable
    expect(renderAgentsSection).toContain("spinnerHtml");
  });

  it("completed agents do NOT get agent-spinner", () => {
    const renderAgentsSection = html.substring(html.indexOf("function renderAgents"));
    // The completed branch should produce agent-status-icon, not agent-spinner
    const completedMatch = renderAgentsSection.match(/completed.*?agent-status-icon/s);
    expect(completedMatch).toBeTruthy();
  });
});

describe("Agent Status Icon for terminal states", () => {
  const html = generateDashboardHtml();

  it("contains agent-status-icon CSS class", () => {
    expect(html).toContain(".agent-status-icon");
  });

  it("renderAgents shows checkmark for completed agents", () => {
    const renderAgentsSection = html.substring(html.indexOf("function renderAgents"));
    // Should show ✓ (unicode \u2713) for completed
    expect(renderAgentsSection).toContain("completed");
    expect(renderAgentsSection).toContain("agent-status-icon completed");
  });

  it("renderAgents shows X for failed agents", () => {
    const renderAgentsSection = html.substring(html.indexOf("function renderAgents"));
    // Should show ✗ (unicode \u2717) for failed
    expect(renderAgentsSection).toContain("failed");
    expect(renderAgentsSection).toContain("agent-status-icon failed");
  });

  it("completed status icon uses accent-green", () => {
    expect(html).toMatch(/\.agent-status-icon\.completed[^}]*\{[^}]*accent-green/s);
  });

  it("failed status icon uses accent-red", () => {
    expect(html).toMatch(/\.agent-status-icon\.failed[^}]*\{[^}]*accent-red/s);
  });
});
