import { describe, expect, it } from "bun:test";
import { generateDashboardHtml } from "../../../src/dashboard/index.js";

describe("generateDashboardHtml", () => {
  it("returns a string", () => {
    const html = generateDashboardHtml();
    expect(typeof html).toBe("string");
  });

  it("returns valid HTML with doctype", () => {
    const html = generateDashboardHtml();
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<html");
    expect(html).toContain("</html>");
  });

  it("includes a head section with meta and title", () => {
    const html = generateDashboardHtml();
    expect(html).toContain("<head>");
    expect(html).toContain("</head>");
    expect(html).toContain('<meta charset="utf-8"');
    expect(html).toContain("<title>");
  });

  it("uses default title when no config provided", () => {
    const html = generateDashboardHtml();
    expect(html).toContain("Dark Factory Dashboard");
  });

  it("uses projectName in title when provided", () => {
    const html = generateDashboardHtml({ projectName: "MyProject" });
    expect(html).toContain("MyProject");
  });

  it("includes body with dashboard root element", () => {
    const html = generateDashboardHtml();
    expect(html).toContain("<body>");
    expect(html).toContain("</body>");
    expect(html).toContain('id="app"');
  });

  it("includes inline CSS styles", () => {
    const html = generateDashboardHtml();
    expect(html).toContain("<style>");
    expect(html).toContain("</style>");
  });

  it("includes inline JavaScript", () => {
    const html = generateDashboardHtml();
    expect(html).toContain("<script>");
    expect(html).toContain("</script>");
  });

  it("defaults apiBase to empty string (relative URLs)", () => {
    const html = generateDashboardHtml();
    // The JS should use relative API paths by default
    expect(html).toContain("apiBase");
    expect(html).toContain('"/api/runs"');
  });

  it("uses custom apiBase when provided", () => {
    const html = generateDashboardHtml({ apiBase: "http://localhost:4040" });
    expect(html).toContain("http://localhost:4040");
  });
});

describe("generateDashboardHtml - API integration", () => {
  it("fetches from GET /api/runs endpoint", () => {
    const html = generateDashboardHtml();
    expect(html).toContain("/api/runs");
  });

  it("fetches agent details from GET /api/runs/:id/agents", () => {
    const html = generateDashboardHtml();
    expect(html).toContain("/agents");
  });

  it("fetches modules from GET /api/runs/:id/modules", () => {
    const html = generateDashboardHtml();
    expect(html).toContain("/modules");
  });

  it("handles RunSummary fields in rendering", () => {
    const html = generateDashboardHtml();
    // The JS should reference RunSummary fields
    expect(html).toContain("specId");
    expect(html).toContain("status");
    expect(html).toContain("phase");
    expect(html).toContain("cost");
    expect(html).toContain("elapsed");
    expect(html).toContain("moduleCount");
    expect(html).toContain("completedCount");
  });

  it("handles AgentSummary fields in rendering", () => {
    const html = generateDashboardHtml();
    expect(html).toContain("role");
    expect(html).toContain("tddPhase");
    expect(html).toContain("tddCycles");
    expect(html).toContain("tokens");
  });

  it("handles ModuleStatus fields in rendering", () => {
    const html = generateDashboardHtml();
    expect(html).toContain("depsSatisfied");
    expect(html).toContain("depsTotal");
    expect(html).toContain("contractsAcknowledged");
    expect(html).toContain("contractsTotal");
  });
});

describe("generateDashboardHtml - UI structure", () => {
  it("has a header with project name", () => {
    const html = generateDashboardHtml();
    expect(html).toContain("Dark Factory");
  });

  it("has a runs list section", () => {
    const html = generateDashboardHtml();
    expect(html).toContain("runs-list");
  });

  it("has a run detail section", () => {
    const html = generateDashboardHtml();
    expect(html).toContain("run-detail");
  });

  it("has an agents section", () => {
    const html = generateDashboardHtml();
    expect(html).toContain("agents");
  });

  it("has a modules section", () => {
    const html = generateDashboardHtml();
    expect(html).toContain("modules");
  });

  it("includes auto-refresh functionality", () => {
    const html = generateDashboardHtml();
    // Should have some polling/refresh mechanism
    expect(html).toContain("setInterval");
  });

  it("includes error handling for fetch calls", () => {
    const html = generateDashboardHtml();
    expect(html).toContain("catch");
  });

  it("is self-contained with no external dependencies", () => {
    const html = generateDashboardHtml();
    // Should NOT have external stylesheet links or external script tags
    expect(html).not.toMatch(/<link[^>]+rel="stylesheet"[^>]+href="http/);
    expect(html).not.toMatch(/<script[^>]+src="http/);
  });
});
