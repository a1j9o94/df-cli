import { describe, expect, it } from "bun:test";
import { generateDashboardHtml } from "../../../src/dashboard/index.js";

describe("generateDashboardHtml - XSS safety", () => {
  it("escapes HTML in projectName", () => {
    const html = generateDashboardHtml({
      projectName: '<script>alert("xss")</script>',
    });
    expect(html).not.toContain('<script>alert("xss")</script>');
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes HTML in apiBase", () => {
    const html = generateDashboardHtml({
      apiBase: '"><script>alert(1)</script>',
    });
    // Should be escaped within the script
    expect(html).not.toContain('"><script>alert(1)</script>');
  });
});

describe("generateDashboardHtml - config variations", () => {
  it("handles empty config object", () => {
    const html = generateDashboardHtml({});
    expect(html).toContain("Dark Factory");
    expect(html).toContain("apiBase");
  });

  it("handles undefined config", () => {
    const html = generateDashboardHtml(undefined);
    expect(html).toContain("Dark Factory");
  });

  it("handles config with only projectName", () => {
    const html = generateDashboardHtml({ projectName: "TestProj" });
    expect(html).toContain("TestProj");
    expect(html).toContain("apiBase");
  });

  it("handles config with only apiBase", () => {
    const html = generateDashboardHtml({ apiBase: "http://localhost:3000" });
    expect(html).toContain("Dark Factory");
    expect(html).toContain("http://localhost:3000");
  });
});

describe("generateDashboardHtml - responsive and accessibility", () => {
  it("includes viewport meta tag", () => {
    const html = generateDashboardHtml();
    expect(html).toContain("viewport");
    expect(html).toContain("width=device-width");
  });

  it("includes lang attribute on html tag", () => {
    const html = generateDashboardHtml();
    expect(html).toContain('lang="en"');
  });

  it("includes responsive media query", () => {
    const html = generateDashboardHtml();
    expect(html).toContain("@media");
  });
});

describe("generateDashboardHtml - contract compliance: DashboardAPI", () => {
  it("references all required API endpoints", () => {
    const html = generateDashboardHtml();

    // GET /api/runs -> RunSummary[]
    expect(html).toContain("/api/runs");

    // GET /api/runs/:id/agents -> AgentSummary[]
    expect(html).toMatch(/\/api\/runs\/.*\/agents/);

    // GET /api/runs/:id/modules -> ModuleStatus[]
    expect(html).toMatch(/\/api\/runs\/.*\/modules/);
  });

  it("handles API errors with user-visible messages", () => {
    const html = generateDashboardHtml();
    expect(html).toContain("Error");
    expect(html).toContain("catch");
  });
});

describe("generateDashboardHtml - contract compliance: RunSummary", () => {
  it("renders all RunSummary fields", () => {
    const html = generateDashboardHtml();
    // All fields from RunSummary interface
    expect(html).toContain("specId");
    expect(html).toContain("status");
    expect(html).toContain("phase");
    expect(html).toContain("cost");
    expect(html).toContain("budget");
    expect(html).toContain("elapsed");
    expect(html).toContain("moduleCount");
    expect(html).toContain("completedCount");
    expect(html).toContain("tokensUsed");
  });

  it("handles optional error field", () => {
    const html = generateDashboardHtml();
    // Should conditionally render error
    expect(html).toContain("run.error");
  });
});

describe("generateDashboardHtml - contract compliance: AgentSummary", () => {
  it("renders all AgentSummary fields", () => {
    const html = generateDashboardHtml();
    expect(html).toContain("a.name");
    expect(html).toContain("a.role");
    expect(html).toContain("a.status");
    expect(html).toContain("a.cost");
    expect(html).toContain("a.tokens");
    expect(html).toContain("a.elapsed");
  });

  it("handles optional moduleId field", () => {
    const html = generateDashboardHtml();
    expect(html).toContain("a.moduleId");
  });

  it("handles optional tddPhase/tddCycles fields", () => {
    const html = generateDashboardHtml();
    expect(html).toContain("a.tddPhase");
    expect(html).toContain("a.tddCycles");
  });

  it("handles optional error field", () => {
    const html = generateDashboardHtml();
    expect(html).toContain("a.error");
  });
});

describe("generateDashboardHtml - contract compliance: ModuleStatus", () => {
  it("renders all ModuleStatus fields", () => {
    const html = generateDashboardHtml();
    expect(html).toContain("m.title");
    expect(html).toContain("m.id");
    expect(html).toContain("m.agentStatus");
    expect(html).toContain("m.cost");
    expect(html).toContain("m.tokens");
    expect(html).toContain("m.tddPhase");
    expect(html).toContain("m.tddCycles");
    expect(html).toContain("m.filesChanged");
    expect(html).toContain("m.depsSatisfied");
    expect(html).toContain("m.depsTotal");
    expect(html).toContain("m.contractsAcknowledged");
    expect(html).toContain("m.contractsTotal");
  });
});

describe("generateDashboardHtml - UIExport compliance", () => {
  it("exports the function with correct signature", () => {
    // The function must accept optional DashboardConfig and return string
    expect(typeof generateDashboardHtml).toBe("function");
    expect(typeof generateDashboardHtml()).toBe("string");
    expect(typeof generateDashboardHtml({})).toBe("string");
    expect(typeof generateDashboardHtml({ projectName: "X" })).toBe("string");
    expect(typeof generateDashboardHtml({ apiBase: "/api" })).toBe("string");
    expect(typeof generateDashboardHtml({ projectName: "X", apiBase: "/api" })).toBe("string");
  });
});
