import { describe, expect, it } from "bun:test";
import { generateDashboardHtml } from "../../../src/dashboard/index.js";

describe("Sidebar Redesign — spec-centric sidebar", () => {
  const html = generateDashboardHtml();

  it("has a specs-list section replacing or alongside runs-list", () => {
    expect(html).toContain('id="specs-list"');
  });

  it("has a specs container for rendering spec cards", () => {
    expect(html).toContain('id="specs-container"');
  });

  it("sidebar section title says Specs", () => {
    expect(html).toContain(">Specs<");
  });

  it("has a New Spec button in the sidebar header", () => {
    expect(html).toContain('id="new-spec-btn"');
    expect(html).toContain("New Spec");
  });
});

describe("Sidebar Redesign — spec card rendering in JS", () => {
  const html = generateDashboardHtml();

  it("fetches from GET /api/specs for sidebar data", () => {
    expect(html).toContain('"/api/specs"');
  });

  it("renders spec cards with spec-card class", () => {
    expect(html).toContain("spec-card");
  });

  it("shows spec title in cards", () => {
    expect(html).toContain("spec-card-title");
  });

  it("shows last modified date in cards", () => {
    expect(html).toContain("lastModified");
  });

  it("groups specs by status (building, draft, completed)", () => {
    expect(html).toContain("spec-group");
  });

  it("shows pass rate for completed specs", () => {
    expect(html).toContain("passRate");
  });
});

describe("Sidebar Redesign — spec detail loading", () => {
  const html = generateDashboardHtml();

  it("has a selectSpec function for loading spec detail", () => {
    expect(html).toContain("selectSpec");
  });

  it("fetches spec detail from GET /api/specs/:id", () => {
    // The JS should construct /api/specs/ + specId for detail
    expect(html).toContain('"/api/specs/" + ');
  });

  it("still has run detail accessible (spec-runs section)", () => {
    expect(html).toContain("spec-runs");
  });

  it("fetches runs for a spec from GET /api/specs/:id/runs", () => {
    expect(html).toContain("/runs");
  });
});

describe("Sidebar Redesign — CSS styles for spec cards", () => {
  const html = generateDashboardHtml();

  it("includes spec-card styles", () => {
    expect(html).toContain(".spec-card");
  });

  it("includes spec-group styles", () => {
    expect(html).toContain(".spec-group");
  });

  it("includes new-spec-btn styles", () => {
    expect(html).toContain(".new-spec-btn");
  });

  it("includes spec-card-title styles", () => {
    expect(html).toContain(".spec-card-title");
  });

  it("includes spec-pass-rate styles", () => {
    expect(html).toContain(".spec-pass-rate");
  });
});

describe("Sidebar Redesign — preserves existing functionality", () => {
  const html = generateDashboardHtml();

  it("still includes auto-refresh polling", () => {
    expect(html).toContain("setInterval");
  });

  it("still includes tab switching", () => {
    expect(html).toContain("tab-bar");
    expect(html).toContain("TAB_DEFS");
  });

  it("still includes 5-second refresh interval", () => {
    expect(html).toContain("REFRESH_INTERVAL");
    expect(html).toContain("5000");
  });

  it("still includes run detail panels", () => {
    expect(html).toContain("detail-panels");
  });

  it("still includes agents section", () => {
    expect(html).toContain("agents-container");
  });

  it("still includes modules section", () => {
    expect(html).toContain("modules-container");
  });
});
