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

  it("agentStatusIcon function adds agent-spinner for running agents", () => {
    // The agentStatusIcon helper determines what icon to render based on status
    const iconFnSection = html.substring(html.indexOf("function agentStatusIcon"));
    expect(iconFnSection).toContain("agent-spinner");
    expect(iconFnSection).toContain("running");
  });

  it("agent-spinner is only shown for running or spawning status", () => {
    const iconFnSection = html.substring(html.indexOf("function agentStatusIcon"));
    // Should check for running and spawning
    expect(iconFnSection).toContain("running");
    expect(iconFnSection).toContain("spawning");
    // Both should produce agent-spinner elements
    const runningIdx = iconFnSection.indexOf('"running"');
    const spawningIdx = iconFnSection.indexOf('"spawning"');
    expect(runningIdx).toBeGreaterThan(-1);
    expect(spawningIdx).toBeGreaterThan(-1);
  });

  it("renderAgents uses agentStatusIcon to render status", () => {
    const renderAgentsSection = html.substring(html.indexOf("function renderAgents"));
    expect(renderAgentsSection).toContain("agentStatusIcon");
  });

  it("completed agents do NOT get agent-spinner", () => {
    const iconFnSection = html.substring(html.indexOf("function agentStatusIcon"));
    // The completed branch should produce agent-status-icon, not agent-spinner
    const completedMatch = iconFnSection.match(/completed.*?return[^;]+;/s);
    expect(completedMatch).toBeTruthy();
    expect(completedMatch![0]).toContain("agent-status-icon");
    expect(completedMatch![0]).not.toContain("agent-spinner");
  });
});

describe("Agent Status Icon for terminal states", () => {
  const html = generateDashboardHtml();

  it("contains agent-status-icon CSS class", () => {
    expect(html).toContain(".agent-status-icon");
  });

  it("agentStatusIcon shows checkmark for completed agents", () => {
    const iconFnSection = html.substring(html.indexOf("function agentStatusIcon"));
    // Should show ✓ (unicode \u2713) for completed
    expect(iconFnSection).toContain("completed");
    expect(iconFnSection).toContain("agent-status-icon completed");
  });

  it("agentStatusIcon shows X for failed agents", () => {
    const iconFnSection = html.substring(html.indexOf("function agentStatusIcon"));
    // Should show ✗ (unicode \u2717) for failed
    expect(iconFnSection).toContain("failed");
    expect(iconFnSection).toContain("agent-status-icon failed");
  });

  it("completed status icon uses accent-green", () => {
    expect(html).toMatch(/\.agent-status-icon\.completed[^}]*\{[^}]*accent-green/s);
  });

  it("failed status icon uses accent-red", () => {
    expect(html).toMatch(/\.agent-status-icon\.failed[^}]*\{[^}]*accent-red/s);
  });
});
